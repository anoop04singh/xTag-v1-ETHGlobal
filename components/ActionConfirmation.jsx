"use client";

import { useState } from 'react';
import { Check, Zap } from 'lucide-react';

export default function ActionConfirmation({ command, onConfirm }) {
  const [confirmed, setConfirmed] = useState(false);

  const handleClick = () => {
    setConfirmed(true);
    onConfirm(command);
  };

  const commandName = command.match(/"([^"]+)"/)?.[1] || 'action';

  if (confirmed) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <Check className="h-4 w-4" />
        <span>Command authorized. Running "{commandName}"...</span>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:ring-offset-zinc-900"
      >
        <Zap className="h-4 w-4" />
        <span>Yes, run "{commandName}"</span>
      </button>
    </div>
  );
}