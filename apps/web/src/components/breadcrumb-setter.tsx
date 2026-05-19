"use client";

import { useEffect } from "react";
import { useBreadcrumbContext } from "@/src/providers/breadcrumb-provider";

interface BreadcrumbSetterProps {
  labels: Record<string, string>;
}

/**
 * Renders nothing — just registers dynamic segment labels (e.g. org name,
 * project name) into the breadcrumb context so AppBreadcrumb can display them.
 * Call from any server component page by passing the already-fetched data.
 *
 * Example:
 *   <BreadcrumbSetter labels={{ [orgSlug]: org.name, [projectId]: project.name }} />
 */
export function BreadcrumbSetter({ labels }: BreadcrumbSetterProps) {
  const { setLabels } = useBreadcrumbContext();

  // Stringify as a stable dep — labels is a new object each render but
  // values only change when the fetched data changes.
  const _labelsKey = JSON.stringify(labels);

  useEffect(() => {
    setLabels(labels);
    return () => setLabels({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setLabels, labels]);

  return null;
}
