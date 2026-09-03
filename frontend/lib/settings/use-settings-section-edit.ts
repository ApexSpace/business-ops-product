import { useCallback, useState } from "react";

/**
 * Section-level edit mode for settings pages.
 * Default `null` means every section is in view mode.
 */
export function useSettingsSectionEdit<TSection extends string = string>() {
  const [editingSection, setEditingSection] = useState<TSection | null>(null);

  const startEdit = useCallback((id: TSection) => {
    setEditingSection(id);
  }, []);

  const stopEdit = useCallback(() => {
    setEditingSection(null);
  }, []);

  const isEditing = useCallback(
    (id: TSection) => editingSection === id,
    [editingSection],
  );

  return {
    editingSection,
    startEdit,
    stopEdit,
    isEditing,
    setEditingSection,
  };
}
