"use client";

import { cn } from "@/utils/cn";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { LoginLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import Editor, { type EditorProps } from "@monaco-editor/react";
import type { Submission } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
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
import { createSubmission, updateSubmission } from "./actions";

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
  function handleEditorDidMount(
    _editor: monaco.editor.IStandaloneCodeEditor,
    m: typeof monaco,
  ) {
    m.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      diagnosticCodesToIgnore: [2393],
    });
  }
  return (
    <Editor
      {...props}
      className="border border-zinc-700"
      defaultLanguage="typescript"
      height="40%"
      loading={<Loading className="h-10 w-10" />}
      onMount={handleEditorDidMount}
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
  const { user } = useKindeBrowserClient();
  const { data: submissions } = useQuery({
    queryKey: ["submissions"],
    queryFn: async () => {
      const response = await fetch("/api/submission");
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const { error } = await response.json();
          throw new Error(
            error.message ? error.message : "Unable to retrieve submissions",
          );
        } else {
          throw new Error("Unable to retrieve submissions");
        }
      }
      return ((await response.json()) as Submission[]) ?? null;
    },
  });
  const { complete, completion, error, isLoading } = useCompletion();
  const exercises = ["Linear search", "Binary search"];
  const [warnings, setWarnings] = useState(0);
  const [exercise, setExercise] = useState(exercises[0]);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  function handleEditorDidMount(
    editor: monaco.editor.IStandaloneCodeEditor,
    m: typeof monaco,
  ) {
    editorRef.current = editor;
    m.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      diagnosticCodesToIgnore: [2393],
    });
  }
  function handleEditorValidation(markers: monaco.editor.IMarker[]) {
    setWarnings(markers.length);
    // markers.forEach((marker) => console.log("onValidate:", marker.message));
  }
  /**
   * @see https://sdk.vercel.ai/docs/api-reference/use-completion
   */
  const handleOnClick = async () => {
    if (!editorRef.current?.getValue())
      return toast.warning("Submission cannot be empty.");
    const response = await complete(editorRef.current.getValue(), {
      body: {
        exercise,
      },
    });
    if (error) {
      toast.error(error.message);
      console.log(error.message);
    } else {
      if (response) {
        if (
          submissions?.find(
            (item) => item.exercise === exercise && item.userId === user?.id,
          )
        ) {
          const id = submissions?.find(
            (item) => item.exercise === exercise && item.userId === user?.id,
          )?.id as string;
          try {
            await updateSubmission({
              id,
              exercise,
              submission: editorRef.current.getValue(),
              response,
              passed: response.includes("{ passed: true }"),
              userId: user?.id as string,
            });
            toast.success("Submission updated successfully!");
          } catch (err: any) {
            toast.error(err.message);
            console.log(err.message);
          }
        } else {
          try {
            await createSubmission({
              exercise,
              submission: editorRef.current.getValue(),
              response,
              passed: response.includes("{ passed: true }"),
              userId: user?.id as string,
            });
            toast.success("Submission saved successfully!");
          } catch (err: any) {
            toast.error(err.message);
            console.log(err.message);
          }
        }
      }
    }
  };
  return (
    <>
      <div className="h-[calc(100vh-2rem)] overflow-hidden rounded-lg">
        <div
          className={cn(
            user
              ? "h-[15%] sm:h-[7.5%] sm:justify-between"
              : "h-[7.5%] sm:justify-end",
            "sticky top-0 flex shrink-0 flex-col justify-center gap-4 rounded-t-lg border-x border-t border-zinc-700 bg-[#1e1e1e] px-4 sm:flex-row sm:items-center",
          )}
        >
          {user && (
            <div className="flex items-center gap-x-3">
              <div>
                <img
                  alt="avatar"
                  className="inline-block h-10 w-10 rounded-full bg-zinc-700"
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                />
              </div>
              <div className="flex flex-col">
                <span className="max-w-24 truncate text-sm font-medium text-white/90">
                  {user.id}
                </span>
                <LogoutLink className="text-xs font-medium text-white/70">
                  Logout
                </LogoutLink>
              </div>
            </div>
          )}
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
          key={exercise}
          onMount={handleEditorDidMount}
          onValidate={handleEditorValidation}
          value={
            submissions?.find(
              (item) => item.exercise === exercise && item.userId === user?.id,
            )?.submission
          }
        />
        <ReadOnlyEditor
          value={
            completion
              ? completion
              : submissions?.find(
                  (item) =>
                    item.exercise === exercise && item.userId === user?.id,
                )?.response
          }
        />
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
          {user ? (
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
          ) : (
            <LoginLink className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 transition-all duration-300 hover:bg-gray-50">
              Submit
            </LoginLink>
          )}
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
