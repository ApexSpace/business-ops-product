"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactActionRail } from "@/features/contacts/components/contact-workspace/contact-action-rail";
import { ContactRecordsPanel } from "@/features/contacts/components/contact-workspace/contact-records-panel";
import {
  WORKSPACE_PADDING_CLASS,
  type ContactMobilePanel,
  type ContactRailItem,
  type ContactRecordsSectionId,
} from "@/features/contacts/workspace/contact-workspace";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ContactWorkspaceMobileTabsProps {
  mobilePanel: ContactMobilePanel;
  onMobilePanelChange: (panel: ContactMobilePanel) => void;
  activeSection: ContactRecordsSectionId;
  onSectionChange: (section: ContactRecordsSectionId) => void;
  onRailSelect: (item: ContactRailItem) => void;
  sidebarPanel: ReactNode;
  conversationPanel: ReactNode;
  recordsPanelProps: React.ComponentProps<typeof ContactRecordsPanel>;
}

export function ContactWorkspaceMobileTabs({
  mobilePanel,
  onMobilePanelChange,
  activeSection,
  onRailSelect,
  sidebarPanel,
  conversationPanel,
  recordsPanelProps,
  onSectionChange,
}: ContactWorkspaceMobileTabsProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden xl:hidden">
      <Tabs
        value={mobilePanel}
        onValueChange={(v) => onMobilePanelChange(v as ContactMobilePanel)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-2 mt-2 grid h-10 shrink-0 grid-cols-4 px-0 sm:mx-2.5">
          <TabsTrigger value="details" className="text-xs">
            Contact
          </TabsTrigger>
          <TabsTrigger value="conversation" className="text-xs">
            Messages
          </TabsTrigger>
          <TabsTrigger value="records" className="text-xs">
            Records
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">
            Actions
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="details"
          className={cn(
            "mt-0 min-h-0 flex-1 overflow-hidden pb-2",
            WORKSPACE_PADDING_CLASS,
          )}
        >
          {sidebarPanel}
        </TabsContent>
        <TabsContent
          value="conversation"
          className={cn(
            "mt-0 min-h-0 flex-1 overflow-hidden pb-2",
            WORKSPACE_PADDING_CLASS,
          )}
        >
          {conversationPanel}
        </TabsContent>
        <TabsContent
          value="records"
          className={cn(
            "mt-0 min-h-0 flex-1 overflow-hidden pb-2",
            WORKSPACE_PADDING_CLASS,
          )}
        >
          <ContactRecordsPanel
            {...recordsPanelProps}
            showSectionPicker
            onSectionChange={onSectionChange}
          />
        </TabsContent>
        <TabsContent
          value="actions"
          className={cn(
            "mt-0 min-h-0 flex-1 overflow-hidden pb-2",
            WORKSPACE_PADDING_CLASS,
          )}
        >
          <ContactActionRail
            layout="grid"
            className="h-full"
            activeSection={activeSection}
            onSelect={onRailSelect}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
