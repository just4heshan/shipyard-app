"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/src/providers/trpc-react-provider";

interface ProjectHeaderProps {
  projectId: string;
  orgId: string;
  orgSlug: string;
  initialName: string;
  initialDescription: string | null;
  canManage: boolean;
  isArchived: boolean;
}

export function ProjectHeader({
  projectId,
  orgId,
  orgSlug: _orgSlug,
  initialName,
  initialDescription,
  canManage,
  isArchived,
}: ProjectHeaderProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);

  const update = trpc.project.update.useMutation({
    onSuccess: () => router.refresh(),
  });

  // Focus the input when editing starts
  useEffect(() => {
    if (editingName) nameInputRef.current?.select();
  }, [editingName]);

  useEffect(() => {
    if (editingDesc) descTextareaRef.current?.select();
  }, [editingDesc]);

  function saveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(initialName);
      setEditingName(false);
      return;
    }
    setEditingName(false);
    if (trimmed !== initialName) {
      update.mutate({ projectId, orgId, name: trimmed });
    }
  }

  function saveDesc() {
    const trimmed = description.trim();
    setEditingDesc(false);
    const prev = initialDescription ?? "";
    if (trimmed !== prev) {
      update.mutate({
        projectId,
        orgId,
        description: trimmed || null,
      });
    }
  }

  const editable = canManage && !isArchived;

  return (
    <div className="space-y-1 shrink-0">
      {/* Project name */}
      {editingName ? (
        <input
          ref={nameInputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveName();
            }
            if (e.key === "Escape") {
              setName(initialName);
              setEditingName(false);
            }
          }}
          maxLength={100}
          className="w-full text-xl font-bold tracking-tight bg-transparent border-b border-border focus:border-foreground outline-none pb-0.5"
        />
      ) : (
        <h1
          className={`text-xl font-bold tracking-tight ${editable ? "cursor-text hover:text-foreground/80" : ""}`}
          onClick={() => editable && setEditingName(true)}
          title={editable ? "Click to edit" : undefined}
        >
          {name}
        </h1>
      )}

      {/* Project description */}
      {editingDesc ? (
        <textarea
          ref={descTextareaRef}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDesc}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDescription(initialDescription ?? "");
              setEditingDesc(false);
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              saveDesc();
            }
          }}
          maxLength={500}
          rows={2}
          placeholder="Add a description…"
          className="w-full text-sm text-muted-foreground bg-transparent border-b border-border focus:border-foreground outline-none resize-none pb-0.5"
        />
      ) : (
        <p
          className={`text-sm ${description ? "text-muted-foreground" : "text-muted-foreground/40"} ${editable ? "cursor-text hover:text-muted-foreground/80" : ""}`}
          onClick={() => editable && setEditingDesc(true)}
          title={editable ? "Click to edit" : undefined}
        >
          {description || (editable ? "Add a description…" : "")}
        </p>
      )}
    </div>
  );
}
