"use client";

import { cn } from "@/utils/cn";
import { getEventDeltas, preventSelection } from "@/utils/helpers";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { LoginLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import Editor, { type EditorProps } from "@monaco-editor/react";
import type { Submission } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompletion } from "ai/react";
import {
  AnimatePresence,
  motion,
  type Transition,
  type Variants,
} from "framer-motion";
import type * as monaco from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import {
  createSubmission,
  deleteSubmission,
  updateSubmission,
} from "./actions";
import { exercises, useExerciseStore } from "./store";

const MIN_HEIGHT = 150;

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
      diagnosticCodesToIgnore: [2393, 2451],
    });
  }
  return (
    <Editor
      {...props}
      className="border border-zinc-700"
      defaultLanguage="typescript"
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
  const queryClient = useQueryClient();
  const { user } = useKindeBrowserClient();
  const resizer = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const responsePanel = useRef<HTMLDivElement>(null);
  const responsePanelSection = useRef<HTMLDivElement>(null);
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
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      submission,
      response,
    }: {
      id: string;
      submission: string;
      response: string;
    }) => {
      await updateSubmission({
        id,
        exercise,
        submission,
        response,
        passed: response.includes("{ passed: true }"),
        userId: user?.id as string,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["submissions"],
      });
    },
  });
  const createMutation = useMutation({
    mutationFn: async ({
      submission,
      response,
    }: {
      submission: string;
      response: string;
    }) => {
      await createSubmission({
        exercise,
        submission,
        response,
        passed: response.includes("{ passed: true }"),
        userId: user?.id as string,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["submissions"],
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteSubmission({
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["submissions"],
      });
    },
  });
  const { complete, completion, error, isLoading } = useCompletion();
  const { exercise, setExercise } = useExerciseStore();
  const [warnings, setWarnings] = useState(0);
  const [responsePanelHeight, setResponsePanelHeight] = useState(MIN_HEIGHT);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  function handleEditorDidMount(
    editor: monaco.editor.IStandaloneCodeEditor,
    m: typeof monaco,
  ) {
    editorRef.current = editor;
    m.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      diagnosticCodesToIgnore: [2393, 2451],
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
          toast.promise(
            updateMutation.mutateAsync({
              id,
              submission: editorRef.current.getValue(),
              response,
            }),
            {
              loading: "Loading...",
              success: () => "Submission updated successfully!",
              error: (err) => err.message,
            },
          );
        } else {
          toast.promise(
            createMutation.mutateAsync({
              submission: editorRef.current.getValue(),
              response,
            }),
            {
              loading: "Loading...",
              success: () => "Submission saved successfully!",
              error: (err) => err.message,
            },
          );
        }
      }
    }
  };
  /**
   * @see https://github.com/typehero/typehero/blob/main/packages/monaco/src/split-editor.tsx#L185-L282
   */
  useEffect(() => {
    const resizerRef = resizer.current;
    const responsePanelRef = responsePanel.current;
    const responsePanelSectionRef = responsePanelSection.current;
    const wrapperRef = wrapper.current;

    if (
      !resizerRef ||
      !responsePanelRef ||
      !wrapperRef ||
      !responsePanelSectionRef
    ) {
      return;
    }

    let y = 0;
    let initialHeight = responsePanelRef.offsetHeight;

    const mouseMoveHandler = (e: MouseEvent | TouchEvent) => {
      // Remove transition during drag because of performance issues
      if (responsePanelSectionRef.classList.contains("transition-all")) {
        responsePanelSectionRef.classList.remove("transition-all");
      }

      document.body.style.setProperty("cursor", "row-resize");

      const { dy } = getEventDeltas(e, { x: 0, y });

      const height = initialHeight - dy;

      if (height >= MIN_HEIGHT) {
        const newHeight = Math.min(height, wrapperRef.offsetHeight - 200);
        responsePanelRef.style.height = `${newHeight}px`;
      }
    };

    const mouseDownHandler = (e: MouseEvent | TouchEvent) => {
      initialHeight = responsePanelRef.offsetHeight;

      if (e instanceof MouseEvent) {
        y = e.clientY;
      } else if (e instanceof TouchEvent) {
        y = e.touches[0]?.clientY ?? 0;
      }

      if (e instanceof MouseEvent) {
        document.addEventListener("mousemove", mouseMoveHandler);
        document.addEventListener("mouseup", mouseUpHandler);
      } else if (e instanceof TouchEvent) {
        document.addEventListener("touchmove", mouseMoveHandler);
        document.addEventListener("touchend", mouseUpHandler);
      }

      // Prevent selection during drag
      document.addEventListener("selectstart", preventSelection);
    };

    const mouseUpHandler = function () {
      // Restore transition
      responsePanelSectionRef.classList.add("transition-all");

      document.body.style.removeProperty("cursor");

      document.removeEventListener("touchmove", mouseMoveHandler);
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("touchend", mouseUpHandler);
      document.removeEventListener("mouseup", mouseUpHandler);

      // Restore selection
      document.removeEventListener("selectstart", preventSelection);

      setResponsePanelHeight(
        responsePanelRef.offsetHeight < MIN_HEIGHT
          ? MIN_HEIGHT
          : responsePanelRef.offsetHeight,
      );
    };

    const resizeHandler = () => {
      if (responsePanelRef.offsetHeight >= MIN_HEIGHT) {
        responsePanelRef.style.height = `${Math.min(
          responsePanelRef.offsetHeight,
          wrapperRef.offsetHeight - 200,
        )}px`;
      }
    };

    window.addEventListener("resize", resizeHandler);
    resizerRef.addEventListener("mousedown", mouseDownHandler);
    resizerRef.addEventListener("touchstart", mouseDownHandler);

    return () => {
      window.removeEventListener("resize", resizeHandler);
      resizerRef.removeEventListener("mousedown", mouseDownHandler);
      resizerRef.removeEventListener("touchstart", mouseDownHandler);
    };
  }, [setResponsePanelHeight]);
  return (
    <>
      <div
        className="flex h-[calc(100vh-2rem)] flex-col rounded-lg"
        ref={wrapper}
      >
        <div
          className={cn(
            user ? "sm:justify-between" : "sm:justify-end",
            "sticky top-0 flex h-[100px] shrink-0 flex-col justify-center gap-4 rounded-t-lg border-x border-t border-zinc-700 bg-[#1e1e1e] px-4 sm:flex-row sm:items-center",
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
          <div className="flex items-center gap-x-3">
            {submissions?.find(
              (item) => item.exercise === exercise && item.userId === user?.id,
            ) && (
              <button
                className="rounded-md border border-zinc-700 p-2"
                onClick={() =>
                  toast.promise(
                    deleteMutation.mutateAsync(
                      submissions?.find(
                        (item) =>
                          item.exercise === exercise &&
                          item.userId === user?.id,
                      )?.id as string,
                    ),
                    {
                      loading: "Loading...",
                      success: () => "Submission resetted successfully!",
                      error: (err) => err.message,
                    },
                  )
                }
              >
                <ArrowPathIcon className="h-5 w-5 text-white" />
              </button>
            )}
            <select
              className="w-full rounded-md border border-zinc-700 bg-transparent py-1.5 pl-3 pr-10 text-white"
              onChange={(e) =>
                setExercise(e.target.value as (typeof exercises)[number])
              }
              value={exercise}
            >
              {exercises.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="h-full overflow-hidden">
          <CodeEditor
            key={submissions?.length + " - " + exercise + " - submission"}
            onMount={handleEditorDidMount}
            onValidate={handleEditorValidation}
            value={
              submissions?.find(
                (item) =>
                  item.exercise === exercise && item.userId === user?.id,
              )?.submission
            }
          />
        </div>
        <div className="transition-all" ref={responsePanelSection}>
          <div
            className="group cursor-row-resize border-y border-zinc-200 bg-zinc-100 p-2 dark:border-zinc-700 dark:bg-zinc-800"
            ref={resizer}
          >
            <div className="m-auto h-1 w-24 rounded-full bg-zinc-300 duration-300 group-hover:bg-blue-500 group-active:bg-blue-500 dark:bg-zinc-700 group-hover:dark:bg-blue-500" />
          </div>
          <div
            ref={responsePanel}
            style={{
              height: `${responsePanelHeight}px`,
            }}
          >
            <ReadOnlyEditor
              key={submissions?.length + " - " + exercise + " - response"}
              value={
                completion
                  ? completion
                  : submissions?.find(
                      (item) =>
                        item.exercise === exercise && item.userId === user?.id,
                    )?.response
              }
            />
          </div>
        </div>
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
                warnings || isLoading || queryClient.isMutating()
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
