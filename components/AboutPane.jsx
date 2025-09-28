"use client";
import Documentation from './Documentation';

export default function AboutPane() {
  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950">
      <Documentation />
    </div>
  );
}