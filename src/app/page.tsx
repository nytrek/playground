"use client";

import Editor, { EditorProps } from "@monaco-editor/react";

/**
 * @see https://react-svgr.com/playground/
 * @see https://tailwindcss.com/docs/animation
 */
const Loading: React.FC<React.SVGAttributes<SVGSVGElement>> = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className="h-10 w-10 animate-spin text-white"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle
        cx={12}
        cy={12}
        r={10}
        stroke="currentColor"
        strokeWidth={4}
        className="opacity-25"
      />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        className="opacity-75"
      />
    </svg>
  );
};

/**
 * @see https://github.com/typehero/typehero/blob/main/packages/monaco/src/code-editor.tsx
 */
const CodeEditor: React.FC<EditorProps> = (props) => {
  return (
    <Editor
      {...props}
      className="border border-zinc-700"
      defaultLanguage="typescript"
      height="45%"
      loading={<Loading />}
      options={{
        fixedOverflowWidgets: true,
        lineNumbers: "on",
        tabSize: 2,
        insertSpaces: false,
        minimap: {
          enabled: false,
        },
        fontSize: 16,
      }}
      theme="vs-dark"
    />
  );
};

/**
 * @see https://github.com/typehero/typehero/blob/main/packages/monaco/src/split-editor.tsx
 */
const ReadOnlyEditor: React.FC<EditorProps> = (props) => {
  return (
    <Editor
      {...props}
      className="border border-zinc-700"
      defaultLanguage="typescript"
      height="45%"
      loading={<Loading />}
      options={{
        lineNumbers: "off",
        renderValidationDecorations: "on",
        readOnly: true,
      }}
      theme="vs-dark"
    />
  );
};

/**
 * @see https://github.com/suren-atoyan/monaco-react
 */
export default function Home() {
  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden rounded-lg">
      <div className="sticky top-0 flex h-[5%] shrink-0 items-center justify-end gap-4 rounded-t-lg border-x border-t border-zinc-700 bg-[#1e1e1e] px-3 py-2"></div>
      <CodeEditor />
      <ReadOnlyEditor />
      <div className="sticky bottom-0 flex h-[5%] shrink-0 items-center justify-end gap-4 rounded-b-lg border-x border-t border-zinc-700 bg-[#1e1e1e] px-3 py-2"></div>
    </div>
  );
}
