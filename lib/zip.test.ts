import { describe, expect, it } from "vitest";

import { crc32, zipSync, type ZipEntry } from "@/lib/zip";

/**
 * The archive is parsed back out here rather than compared to a fixture. A
 * fixture would prove the bytes have not changed; parsing proves they are a
 * ZIP, which is the thing a user's unzip tool cares about.
 */

const ENTRIES: ZipEntry[] = [
  { name: "mcp-server-ops/server.py", content: 'print("hello")\n' },
  { name: "mcp-server-ops/README.md", content: "# Ops\n\nA server.\n" },
  { name: "mcp-server-ops/tests/test_server.py", content: "def test_ok():\n    assert True\n" },
];

const MODIFIED = new Date(2026, 7, 10, 12, 30, 0);

function view(archive: Uint8Array): DataView {
  return new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
}

/** Read the end-of-central-directory record, which is the last 22 bytes. */
function endRecord(archive: Uint8Array) {
  const data = view(archive);
  const start = archive.length - 22;
  return {
    signature: data.getUint32(start, true),
    entries: data.getUint16(start + 8, true),
    centralSize: data.getUint32(start + 12, true),
    centralOffset: data.getUint32(start + 16, true),
  };
}

describe("crc32", () => {
  it("matches the known checksum for a standard vector", () => {
    // The canonical CRC-32 of "123456789" is 0xCBF43926.
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("is zero for empty input", () => {
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe("zipSync", () => {
  it("writes a local header per entry and a matching central directory", () => {
    const archive = zipSync(ENTRIES, MODIFIED);
    const data = view(archive);

    expect(data.getUint32(0, true)).toBe(0x04034b50);

    const end = endRecord(archive);
    expect(end.signature).toBe(0x06054b50);
    expect(end.entries).toBe(3);
    // The central directory sits exactly where the record says it does.
    expect(data.getUint32(end.centralOffset, true)).toBe(0x02014b50);
    expect(end.centralOffset + end.centralSize + 22).toBe(archive.length);
  });

  it("stores each file uncompressed, with its name and content recoverable", () => {
    const archive = zipSync(ENTRIES, MODIFIED);
    const data = view(archive);
    const decoder = new TextDecoder();

    let cursor = 0;
    for (const entry of ENTRIES) {
      expect(data.getUint32(cursor, true)).toBe(0x04034b50);
      expect(data.getUint16(cursor + 8, true)).toBe(0); // method: stored
      // UTF-8 flag, so a non-ASCII filename is not mangled by the extractor.
      expect(data.getUint16(cursor + 6, true) & 0x0800).toBe(0x0800);

      const compressed = data.getUint32(cursor + 18, true);
      const uncompressed = data.getUint32(cursor + 22, true);
      expect(compressed).toBe(uncompressed);

      const nameLength = data.getUint16(cursor + 26, true);
      const name = decoder.decode(archive.subarray(cursor + 30, cursor + 30 + nameLength));
      expect(name).toBe(entry.name);

      const start = cursor + 30 + nameLength;
      expect(decoder.decode(archive.subarray(start, start + uncompressed))).toBe(entry.content);
      expect(data.getUint32(cursor + 14, true)).toBe(
        crc32(new TextEncoder().encode(entry.content)),
      );

      cursor = start + uncompressed;
    }
  });

  it("records a local-header offset that actually points at that header", () => {
    const archive = zipSync(ENTRIES, MODIFIED);
    const data = view(archive);
    const end = endRecord(archive);

    let cursor = end.centralOffset;
    for (let index = 0; index < end.entries; index += 1) {
      const nameLength = data.getUint16(cursor + 28, true);
      const localOffset = data.getUint32(cursor + 42, true);
      expect(data.getUint32(localOffset, true)).toBe(0x04034b50);
      cursor += 46 + nameLength;
    }
  });

  it("handles non-ASCII content without truncating the byte length", () => {
    // A naive implementation writes `content.length` — the character count —
    // and produces an archive that unzips to a truncated file.
    const archive = zipSync([{ name: "notes.md", content: "café — 日本語\n" }], MODIFIED);
    const data = view(archive);
    const bytes = new TextEncoder().encode("café — 日本語\n");

    expect(data.getUint32(22, true)).toBe(bytes.length);
    expect(bytes.length).toBeGreaterThan("café — 日本語\n".length);
  });

  it("produces a valid empty archive", () => {
    const archive = zipSync([], MODIFIED);

    expect(archive.length).toBe(22);
    expect(endRecord(archive).entries).toBe(0);
  });
});
