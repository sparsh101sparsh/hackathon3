'use client';

import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  onSubmit?: () => void;
  readOnly?: boolean;
}

export const MONACO_LANG_MAP: Record<string, string> = {
  python: 'python',
  python3: 'python',
  cpp: 'cpp',
  'c++': 'cpp',
  javascript: 'javascript',
  js: 'javascript',
  java: 'java',
  go: 'go',
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  value,
  onChange,
  onRun,
  onSubmit,
  readOnly = false,
}) => {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Keybindings: Cmd+Enter / Ctrl+Enter for Run Code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRun) onRun();
    });

    // Keybindings: Cmd+Shift+Enter / Ctrl+Shift+Enter for Submit
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
      () => {
        if (onSubmit) onSubmit();
      }
    );
  };

  const monacoLanguage = MONACO_LANG_MAP[language.toLowerCase()] || 'python';

  return (
    <div className="w-full h-full min-h-[350px] relative rounded-lg overflow-hidden border border-slate-800 bg-[#1e1e1e]">
      <Editor
        height="100%"
        width="100%"
        language={monacoLanguage}
        theme="vs-dark"
        value={value}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly: readOnly,
          tabSize: 4,
          insertSpaces: true,
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
};

export default CodeEditor;
