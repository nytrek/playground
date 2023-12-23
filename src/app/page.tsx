"use client";

import Editor, { EditorProps } from "@monaco-editor/react";

const DEFAULT_OPTIONS = {
  fixedOverflowWidgets: true,
  lineNumbers: "on",
  tabSize: 2,
  insertSpaces: false,
  minimap: {
    enabled: false,
  },
  fontSize: 16,
} as const satisfies EditorProps["options"];

/**
 * @see https://github.com/suren-atoyan/monaco-react
 * @see https://github.com/typehero/typehero/blob/main/packages/monaco/src/code-editor.tsx
 */
export default function Home() {
  return (
    <div className="rounded-lg">
      <div className="sticky top-0 flex h-[40px] shrink-0 items-center justify-end gap-4 rounded-t-lg border-x border-t border-zinc-700 bg-[#1e1e1e] px-3 py-2"></div>
      <Editor
        className="border border-zinc-700"
        defaultLanguage="typescript"
        height="90vh"
        options={DEFAULT_OPTIONS}
        theme="vs-dark"
      />
    </div>
  );
}
