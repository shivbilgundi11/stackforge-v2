"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import {
  CodeBlock as CodeBlockPrimitive,
  type CodeBlockProps as CodeBlockPropsPrimitive,
} from "@/components/animate-ui/primitives/animate/code-block";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/animate-ui/components/buttons/copy";
import { getStrictContext } from "@/lib/get-strict-context";

type CodeContextType = {
  code: string;
};

const [CodeProvider, useCode] = getStrictContext<CodeContextType>("CodeContext");

type CodeProps = React.ComponentProps<"div"> & {
  code: string;
};

function Code({ className, code, ...props }: CodeProps) {
  return (
    <CodeProvider value={{ code }}>
      <div
        className={cn(
          "relative flex flex-col overflow-hidden rounded-lg border bg-accent/50",
          className,
        )}
        {...props}
      />
    </CodeProvider>
  );
}

type CodeHeaderProps = React.ComponentProps<"div"> & {
  icon?: React.ElementType;
  copyButton?: boolean;
};

function CodeHeader({
  className,
  children,
  icon: Icon,
  copyButton = false,
  ...props
}: CodeHeaderProps) {
  const { code } = useCode();

  return (
    <div
      className={cn(
        "flex h-10 w-full shrink-0 items-center gap-x-2 border-b border-border/75 bg-accent px-4 text-sm text-muted-foreground dark:border-border/50",
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="size-4" />}
      {children}
      {copyButton && (
        <CopyButton
          content={code}
          size="xs"
          variant="ghost"
          className="-mr-2 ml-auto h-auto w-auto p-2"
        />
      )}
    </div>
  );
}

type CodeBlockProps = Omit<CodeBlockPropsPrimitive, "code"> & {
  cursor?: boolean;
};

function CodeBlock({ cursor, className, ...props }: CodeBlockProps) {
  const { resolvedTheme } = useTheme();
  const { code } = useCode();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  return (
    <CodeBlockPrimitive
      ref={scrollRef}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      scrollContainerRef={scrollRef}
      className={cn(
        "relative overflow-auto p-4 text-sm",
        "[&_code]:!text-[13px] [&_code_.line]:!px-0 [&>pre,_&_code]:border-none [&>pre,_&_code]:!bg-transparent [&>pre,_&_code]:[background:transparent_!important]",
        cursor &&
          "data-[done=false]:[&_.line:last-of-type::after]:inline-block data-[done=false]:[&_.line:last-of-type::after]:w-[1ch] data-[done=false]:[&_.line:last-of-type::after]:-translate-px data-[done=false]:[&_.line:last-of-type::after]:content-['|']",
        className,
      )}
      code={code}
      {...props}
    />
  );
}

export { Code, CodeHeader, CodeBlock, type CodeProps, type CodeHeaderProps, type CodeBlockProps };
