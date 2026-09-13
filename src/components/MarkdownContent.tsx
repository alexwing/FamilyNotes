import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
  className?: string;
  isCompact?: boolean;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className = "",
  isCompact = false,
}) => {
  return (
    <div
      className={`markdown-content text-xs leading-relaxed text-slate-700 dark:text-slate-300 break-words ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1
              className={`${
                isCompact ? "text-sm font-bold my-1" : "text-base font-bold my-2"
              } text-slate-900 dark:text-white`}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className={`${
                isCompact ? "text-xs font-bold my-0.5" : "text-sm font-bold my-1.5"
              } text-slate-900 dark:text-white`}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold my-1 text-slate-800 dark:text-slate-100">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold my-0.5 text-slate-800 dark:text-slate-200">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-0.5 my-1 pl-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-0.5 my-1 pl-1">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-emerald-500/70 pl-2.5 py-0.5 my-1.5 bg-emerald-500/5 text-slate-600 dark:text-slate-400 italic rounded-r">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName && typeof children === "string" && !children.includes("\n");
            if (isInline) {
              return (
                <code
                  className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="block p-2 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto my-1.5 border border-slate-800"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-1.5 overflow-x-auto">{children}</pre>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-emerald-600 dark:text-emerald-400 underline hover:text-emerald-500"
            >
              {children}
            </a>
          ),
          hr: () => (
            <hr className="my-2 border-slate-200 dark:border-slate-800" />
          ),
          input: ({ type, checked, ...props }) => {
            if (type === "checkbox") {
              return (
                <input
                  type="checkbox"
                  checked={!!checked}
                  readOnly
                  className="mr-1.5 inline-block align-middle accent-emerald-500 rounded cursor-default"
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-left border-collapse text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-slate-200 dark:border-slate-800 p-1 font-bold text-slate-900 dark:text-white">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-slate-100 dark:border-slate-800/60 p-1">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
