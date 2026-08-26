"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  connectPlatformDefaultSms,
  connectBusinessTwilio,
  getPlatformDefaultSms,
  getSmsWebhookUrls,
  listTwilioPhoneNumbers,
  type IntegrationsHostMode,
  type PlatformDefaultSms,
} from "@/features/integrations/api/integrations.api";
import type { IntegrationProviderWithStatus } from "@/features/integrations/utils/integrations";
import { queryKeys } from "@/lib/query/keys";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";

export function IntegrationManageSmsBody({
  providerKey,
  provider,
  isConnected,
  host = "business",
}: {
  providerKey: string;
  provider: IntegrationProviderWithStatus;
  isConnected: boolean;
  host?: IntegrationsHostMode;
}) {
  const queryClient = useQueryClient();
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumberSid, setPhoneNumberSid] = useState("");
  const [availableNumbers, setAvailableNumbers] = useState<
    Array<{ sid: string; phoneNumber: string; friendlyName: string }>
  >([]);

  const platformQuery = useQuery({
    queryKey: [...queryKeys.integrations.all(), "sms", host, "platform-default"],
    queryFn: () => getPlatformDefaultSms(host),
    enabled: providerKey === "sms",
  });

  const webhookQuery = useQuery({
    queryKey: [...queryKeys.integrations.all(), "sms", host, "webhook-url"],
    queryFn: () => getSmsWebhookUrls(host),
    enabled: providerKey === "sms",
  });

  const activateMutation = useMutation({
    mutationFn: () => connectPlatformDefaultSms(host),
    onSuccess: async () => {
      toast.success("Platform SMS notifications enabled");
      await queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all() });
      await platformQuery.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const listNumbersMutation = useMutation({
    mutationFn: () => listTwilioPhoneNumbers({ accountSid, authToken }, host),
    onSuccess: (numbers) => {
      setAvailableNumbers(numbers);
      if (numbers.length === 0) {
        toast.message("No SMS-capable numbers found on this Twilio account");
      }
      if (numbers.length === 1) {
        setPhoneNumberSid(numbers[0]!.sid);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const connectTwilioMutation = useMutation({
    mutationFn: () =>
      connectBusinessTwilio({ accountSid, authToken, phoneNumberSid }, host),
    onSuccess: async (result) => {
      toast.success(`Twilio number ${result.fromNumber} connected`);
      await queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all() });
      await platformQuery.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const platform: PlatformDefaultSms | null | undefined = platformQuery.data;
  const inboundUrl = webhookQuery.data?.inboundUrl ?? null;

  async function copyWebhook() {
    if (!inboundUrl) return;
    try {
      await navigator.clipboard.writeText(inboundUrl);
      toast.success("Webhook URL copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <p className="font-medium">Twilio account &amp; phone number</p>
          <p className="text-muted-foreground text-sm">
            Connect your Twilio subaccount for two-way SMS in the inbox. We
            validate credentials, list your{" "}
            <span className="font-mono text-xs">IncomingPhoneNumbers</span>, and
            set the number&apos;s SMS webhook to this app when a public URL is
            configured.
          </p>
        </div>

        {isConnected && provider.integration?.connectedAccountName ? (
          <p className="text-sm">
            Connected:{" "}
            <span className="font-medium">
              {provider.integration.connectedAccountName}
            </span>
          </p>
        ) : null}

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="twilio-account-sid">Twilio Account SID</Label>
            <Input
              id="twilio-account-sid"
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value.trim())}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="twilio-auth-token">Auth Token</Label>
            <Input
              id="twilio-auth-token"
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!accountSid || !authToken || listNumbersMutation.isPending}
            onClick={() => listNumbersMutation.mutate()}
          >
            {listNumbersMutation.isPending
              ? "Loading numbers…"
              : "Load SMS phone numbers"}
          </Button>
          {availableNumbers.length > 0 ? (
            <div className="grid gap-1.5">
              <Label htmlFor="twilio-phone-number">Phone number</Label>
              <select
                id="twilio-phone-number"
                className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                value={phoneNumberSid}
                onChange={(e) => setPhoneNumberSid(e.target.value)}
              >
                <option value="">Select a number</option>
                {availableNumbers.map((number) => (
                  <option key={number.sid} value={number.sid}>
                    {number.friendlyName || number.phoneNumber} (
                    {number.phoneNumber})
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <Button
            type="button"
            disabled={
              !accountSid ||
              !authToken ||
              !phoneNumberSid ||
              connectTwilioMutation.isPending
            }
            onClick={() => connectTwilioMutation.mutate()}
          >
            {connectTwilioMutation.isPending
              ? "Connecting…"
              : "Connect Twilio number"}
          </Button>
        </div>

        {inboundUrl ? (
          <div className="space-y-2 rounded-md bg-muted/40 p-3">
            <p className="text-xs font-medium text-foreground">
              Inbound SMS webhook (Twilio console)
            </p>
            <p className="text-muted-foreground break-all font-mono text-xs">
              {inboundUrl}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2"
              onClick={() => void copyWebhook()}
            >
              <Copy className="size-3.5" />
              Copy URL
            </Button>
            <p className="text-muted-foreground text-xs">
              Usually applied automatically on connect. If replies fail, paste this
              into your number&apos;s &quot;A message comes in&quot; webhook in
              Twilio.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            Set{" "}
            <span className="font-mono">BACKEND_PUBLIC_URL</span> to your public
            HTTPS API host so Twilio webhooks and delivery callbacks can reach
            this server.
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-dashed p-4">
        <div>
          <p className="font-medium">Outbound notification SMS</p>
          <p className="text-muted-foreground text-sm">
            US businesses are auto-assigned a local PandaCue Twilio number (same
            area code as your business phone when available) for one-way
            appointment and automation texts. Two-way inbox requires connecting
            your own Twilio number above (or a future SMS Chat add-on).
          </p>
        </div>
        {platform?.fromNumber ? (
          <div className="space-y-1 text-sm">
            <p>
              Notification sender:{" "}
              <span className="font-mono">{platform.fromNumber}</span>
            </p>
            {platform.provisioned ? (
              <p className="text-muted-foreground text-xs">
                Auto-assigned PandaCue number (shared A2P pool)
                {platform.a2pPool ? ` · ${platform.a2pPool}` : ""}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Using shared platform fallback number
              </p>
            )}
          </div>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={activateMutation.isPending}
          onClick={() => activateMutation.mutate()}
        >
          {platform?.fromNumber
            ? "Refresh notification SMS number"
            : "Assign notification SMS number"}
        </Button>
      </section>
    </div>
  );
}
