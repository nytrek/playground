"use client";

import { cn } from "@/utils/cn";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import Editor, { type EditorProps } from "@monaco-editor/react";
import { useCompletion } from "ai/react";
import {
  AnimatePresence,
  motion,
  type Transition,
  type Variants,
} from "framer-motion";
import type * as monaco from "monaco-editor";
import { useRef, useState } from "react";
import { Toaster, toast } from "sonner";

const DEFAULT_OPTIONS = {
  fixedOverflowWidgets: true,
  lineNumbers: "on",
  tabSize: 2,
  insertSpaces: false,
  minimap: {
    enabled: false,
  },
  fontSize: 16,
  wordWrap: "on",
} as const satisfies EditorProps["options"];

const springTransition: Transition = {
  type: "spring",
  bounce: 0.2,
  duration: 0.6,
};

const springVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: springTransition },
  exit: { opacity: 0, y: -20, transition: springTransition },
};

/**
 * @see https://react-svgr.com/playground/
 * @see https://tailwindcss.com/docs/animation
 */
const Loading: React.FC<React.SVGAttributes<SVGSVGElement>> = (props) => {
  return (
    <svg
      {...props}
      className={cn("animate-spin text-white", props.className)}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx={12}
        cy={12}
        r={10}
        stroke="currentColor"
        strokeWidth={4}
      />
      <path
        className="opacity-75"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        fill="currentColor"
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
      loading={<Loading className="h-10 w-10" />}
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
      height="40%"
      loading={<Loading className="h-10 w-10" />}
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
 * @see https://sdk.vercel.ai/docs/api-reference/use-completion
 * @see https://github.com/typehero/typehero/blob/main/packages/monaco/src/vim-mode.tsx
 */
export default function Playground() {
  const { complete, completion, isLoading } = useCompletion();
  const exercises = ["Linear search", "Binary search"];
  const [warnings, setWarnings] = useState(0);
  const [exercise, setExercise] = useState(exercises[0]);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  function handleEditorDidMount(editor: monaco.editor.IStandaloneCodeEditor) {
    editorRef.current = editor;
  }
  function handleEditorValidation(markers: monaco.editor.IMarker[]) {
    setWarnings(markers.length);
    markers.forEach((marker) => console.log("onValidate:", marker.message));
  }
  async function handleOnClick() {
    if (!editorRef.current?.getValue())
      return toast.warning("Submission cannot be empty.");
    await complete(editorRef.current.getValue(), {
      body: {
        exercise,
      },
    });
  }
  return (
    <>
      <div className="h-[calc(100vh-2rem)] overflow-hidden rounded-lg">
        <div className="sticky top-0 flex h-[7.5%] shrink-0 items-center justify-end gap-4 rounded-t-lg border-x border-t border-zinc-700 bg-[#1e1e1e] px-4">
          <select
            className="rounded-md border border-zinc-700 bg-transparent py-1.5 pl-3 pr-10 text-white"
            onChange={(e) =>
              setExercise(
                exercises.find(
                  (item) => item === e.target.value,
                ) as typeof exercise,
              )
            }
          >
            {exercises.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <CodeEditor
          onMount={handleEditorDidMount}
          onValidate={handleEditorValidation}
        />
        <ReadOnlyEditor value={completion} />
        <div className="sticky bottom-0 flex h-[7.5%] shrink-0 items-center justify-between gap-4 rounded-b-lg border-x border-t border-zinc-700 bg-[#1e1e1e] px-4">
          <AnimatePresence mode="popLayout">
            {warnings ? (
              <motion.div
                animate="animate"
                className="flex items-center gap-x-2"
                exit="exit"
                initial="initial"
                key={warnings}
                variants={springVariants}
              >
                <XCircleIcon className="h-6 w-6 text-red-600" />
                <span className="w-full text-white">
                  {warnings > 1
                    ? `${warnings} warnings`
                    : `${warnings} warning`}
                </span>
              </motion.div>
            ) : (
              <motion.div
                animate="animate"
                className="flex items-center gap-x-2"
                exit="exit"
                initial="initial"
                key={warnings}
                variants={springVariants}
              >
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
                <span className="w-full text-white">No warnings</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            className={cn(
              warnings || isLoading
                ? "cursor-not-allowed opacity-50"
                : "opacity-100",
              "rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 transition-all duration-300 hover:bg-gray-50",
            )}
            disabled={!!warnings}
            onClick={() => handleOnClick()}
            type="button"
          >
            {isLoading ? (
              <Loading className="h-5 w-5 text-gray-900" />
            ) : (
              <span>Submit</span>
            )}
          </button>
        </div>
      </div>
      <Toaster
        toastOptions={{
          style: {
            bottom: "4rem",
          },
        }}
        visibleToasts={1}
      />
    </>
  );
}
