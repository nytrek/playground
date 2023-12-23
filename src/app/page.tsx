"use client";

import Editor, { EditorProps } from "@monaco-editor/react";
import type * as monaco from "monaco-editor";
import { useRef } from "react";

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
      options={DEFAULT_OPTIONS}
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
        ...DEFAULT_OPTIONS,
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
 * @see https://github.com/typehero/typehero/blob/main/packages/monaco/src/vim-mode.tsx
 */
export default function Home() {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  function handleEditorDidMount(editor: monaco.editor.IStandaloneCodeEditor) {
    editorRef.current = editor;
  }
  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden rounded-lg">
      <div className="sticky top-0 flex h-[5%] shrink-0 items-center justify-end gap-4 rounded-t-lg border-x border-t border-zinc-700 bg-[#1e1e1e] px-3 py-2">
        <select className="rounded-md border border-zinc-700 bg-transparent py-1.5 pl-3 pr-10 text-white">
          <option>Linear search</option>
        </select>
      </div>
      <CodeEditor onMount={handleEditorDidMount} />
      <ReadOnlyEditor />
      <div className="sticky bottom-0 flex h-[5%] shrink-0 items-center justify-end gap-4 rounded-b-lg border-x border-t border-zinc-700 bg-[#1e1e1e] px-3 py-2">
        <button
          className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          onClick={() => console.log(editorRef.current?.getValue())}
          type="button"
        >
          Run code
        </button>
      </div>
    </div>
  );
}
