"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSnapshotEditor } from "@/features/platform/hooks/use-snapshot-editor";
import type { SnapshotChatbotAsset } from "@/features/platform/types/snapshot";

function newSourceKey(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function ChatbotsBuilder() {
  const { assets, updateAssets, canManage } = useSnapshotEditor();
  const chatbots = assets?.chatbots ?? [];

  const updateChatbots = (next: SnapshotChatbotAsset[]) => {
    updateAssets({ chatbots: next });
  };

  const addChatbot = () => {
    updateChatbots([
      ...chatbots,
      {
        sourceKey: newSourceKey("chatbot"),
        name: "Website assistant",
        rules: [
          {
            sourceKey: newSourceKey("rule"),
            trigger: "hello",
            response: "Hi! How can we help you today?",
          },
        ],
      },
    ]);
  };

  const updateChatbot = (sourceKey: string, patch: Partial<SnapshotChatbotAsset>) => {
    updateChatbots(
      chatbots.map((c) => (c.sourceKey === sourceKey ? { ...c, ...patch } : c)),
    );
  };

  const removeChatbot = (sourceKey: string) => {
    updateChatbots(chatbots.filter((c) => c.sourceKey !== sourceKey));
  };

  const addRule = (chatbotKey: string) => {
    const bot = chatbots.find((c) => c.sourceKey === chatbotKey);
    if (!bot) return;
    updateChatbot(chatbotKey, {
      rules: [
        ...(bot.rules ?? []),
        {
          sourceKey: newSourceKey("rule"),
          trigger: "",
          response: "",
        },
      ],
    });
  };

  const updateRule = (
    chatbotKey: string,
    ruleKey: string,
    patch: { trigger?: string; response?: string },
  ) => {
    const bot = chatbots.find((c) => c.sourceKey === chatbotKey);
    if (!bot) return;
    updateChatbot(chatbotKey, {
      rules: (bot.rules ?? []).map((rule) =>
        rule.sourceKey === ruleKey ? { ...rule, ...patch } : rule,
      ),
    });
  };

  const removeRule = (chatbotKey: string, ruleKey: string) => {
    const bot = chatbots.find((c) => c.sourceKey === chatbotKey);
    if (!bot) return;
    updateChatbot(chatbotKey, {
      rules: (bot.rules ?? []).filter((rule) => rule.sourceKey !== ruleKey),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Chatbots</CardTitle>
          <CardDescription>
            Website chat assistants with simple trigger/response rules.
          </CardDescription>
        </div>
        {canManage ? (
          <Button type="button" size="sm" onClick={addChatbot}>
            <Plus className="mr-2 size-4" />
            Add chatbot
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {chatbots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chatbots configured.</p>
        ) : (
          chatbots.map((bot) => (
            <div key={bot.sourceKey} className="rounded-md border p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={bot.name}
                  disabled={!canManage}
                  onChange={(e) =>
                    updateChatbot(bot.sourceKey, { name: e.target.value })
                  }
                  className="max-w-sm font-medium"
                  placeholder="Chatbot name"
                />
                {canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeChatbot(bot.sourceKey)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When visitor says…</TableHead>
                    <TableHead>Bot responds with…</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bot.rules ?? []).map((rule) => (
                    <TableRow key={rule.sourceKey}>
                      <TableCell>
                        <Input
                          value={rule.trigger}
                          disabled={!canManage}
                          onChange={(e) =>
                            updateRule(bot.sourceKey, rule.sourceKey, {
                              trigger: e.target.value,
                            })
                          }
                          placeholder="hello, pricing, hours…"
                        />
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={rule.response}
                          disabled={!canManage}
                          rows={2}
                          onChange={(e) =>
                            updateRule(bot.sourceKey, rule.sourceKey, {
                              response: e.target.value,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRule(bot.sourceKey, rule.sourceKey)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addRule(bot.sourceKey)}
                >
                  <Plus className="mr-2 size-4" />
                  Add rule
                </Button>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
