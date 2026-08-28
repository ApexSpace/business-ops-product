"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategorizedRegistryList } from "@/features/automations/components/categorized-registry-list";
import { FilterBuilder } from "@/features/automations/components/filter-builder";
import {
  useAutomationActions,
  useAutomationCategories,
  useAutomationConditions,
  useAutomationCustomValues,
  useAutomationFilterOperators,
  useAutomationTriggers,
} from "@/features/automations/hooks/use-automation-metadata";
import type { AutomationFilterRule } from "@/features/automations/types/metadata";
import { countRegistryItemsByCategory } from "@/features/automations/utils/metadata-grouping.util";

export function AutomationRegistryBrowser() {
  const [search, setSearch] = useState("");
  const [filterRule, setFilterRule] = useState<AutomationFilterRule>({
    fieldKey: "",
    operator: "eq",
    value: "",
  });

  const triggerCategories = useAutomationCategories("trigger");
  const actionCategories = useAutomationCategories("action");
  const customValueCategories = useAutomationCategories("custom_value");
  const conditionCategories = useAutomationCategories("condition");
  const triggers = useAutomationTriggers({ search });
  const actions = useAutomationActions({ search });
  const customValues = useAutomationCustomValues({ search });
  const conditions = useAutomationConditions({ search });
  const operators = useAutomationFilterOperators();

  const selectedTrigger = triggers.data?.[0];
  const flatCustomValues = useMemo(
    () => (customValues.data ?? []).flatMap((group) => group.items),
    [customValues.data],
  );

  const triggerCounts = useMemo(
    () => countRegistryItemsByCategory(triggers.data ?? []),
    [triggers.data],
  );
  const actionCounts = useMemo(
    () => countRegistryItemsByCategory(actions.data ?? []),
    [actions.data],
  );

  const isLoading =
    triggers.isLoading ||
    actions.isLoading ||
    customValues.isLoading ||
    conditions.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading automation catalog…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {triggers.data?.length ?? 0} triggers
        </Badge>
        <Badge variant="secondary">{actions.data?.length ?? 0} actions</Badge>
        <Badge variant="secondary">
          {flatCustomValues.length} custom values
        </Badge>
        <Badge variant="secondary">
          {conditions.data?.length ?? 0} conditions
        </Badge>
      </div>

      <Tabs defaultValue="triggers">
        <TabsList>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="custom-values">Custom values</TabsTrigger>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
          <TabsTrigger value="filters">Filter builder</TabsTrigger>
        </TabsList>

        <TabsContent value="triggers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trigger catalog</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                {Object.entries(triggerCounts).map(([category, count]) => (
                  <Badge key={category} variant="outline">
                    {category}: {count}
                  </Badge>
                ))}
              </div>
              <CategorizedRegistryList
                items={triggers.data ?? []}
                categories={triggerCategories.data ?? []}
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder='Search triggers, e.g. "appointment"'
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Action catalog</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                {Object.entries(actionCounts).map(([category, count]) => (
                  <Badge key={category} variant="outline">
                    {category}: {count}
                  </Badge>
                ))}
              </div>
              <CategorizedRegistryList
                items={actions.data ?? []}
                categories={actionCategories.data ?? []}
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder='Search actions, e.g. "email"'
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom-values" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom values</CardTitle>
            </CardHeader>
            <CardContent>
              <CategorizedRegistryList
                items={flatCustomValues.map((item) => ({
                  key: item.key,
                  category: item.category,
                  label: item.label,
                  description: `${item.description} (${item.mergeTag})`,
                  implementationStatus: item.implementationStatus,
                }))}
                categories={customValueCategories.data ?? []}
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search Merge Fields"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conditions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Condition catalog</CardTitle>
            </CardHeader>
            <CardContent>
              <CategorizedRegistryList
                items={conditions.data ?? []}
                categories={conditionCategories.data ?? []}
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search Conditions"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filter builder preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Example using filter fields from the first loaded trigger
                {selectedTrigger ? ` (${selectedTrigger.key})` : ""}.
              </p>
              <FilterBuilder
                fields={selectedTrigger?.filterFields}
                conditions={conditions.data}
                operators={operators.data ?? []}
                value={filterRule}
                onChange={setFilterRule}
              />
              <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs">
                {JSON.stringify(filterRule, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
