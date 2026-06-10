import { HttpStatus, Injectable } from '@nestjs/common';
import { PlanTierStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  PlanEmbedSettingsDto,
  PublicPricingDto,
  UpdatePlanEmbedSettingsDto,
} from '../dto';
import { toPlanEmbedSettings } from '../mappers/plan-group.mapper';
import { PlanGroupsRepository } from '../repositories/plan-groups.repository';
import {
  designSettingsToCssVariables,
  embedGridColumns,
  parsePlanGroupDesignSettings,
  parsePlanTierDesignSettings,
  resolvePlanGroupDesignSettings,
} from '../utils/plan-design-settings.util';
import { PlanValidationService } from './plan-validation.service';

@Injectable()
export class PlanEmbedService {
  constructor(
    private readonly repository: PlanGroupsRepository,
    private readonly validation: PlanValidationService,
    private readonly auditService: AuditService,
  ) {}

  async getSettings(planGroupId: string): Promise<PlanEmbedSettingsDto> {
    await this.requireGroup(planGroupId);
    const settings = await this.requireEmbedSettings(planGroupId);
    return toPlanEmbedSettings(settings);
  }

  async updateSettings(
    planGroupId: string,
    dto: UpdatePlanEmbedSettingsDto,
    actor: RequestUser,
  ): Promise<PlanEmbedSettingsDto> {
    await this.requireGroup(planGroupId);
    await this.requireEmbedSettings(planGroupId);

    const customCss =
      dto.customCss !== undefined
        ? this.validation.sanitizeCustomCss(dto.customCss)
        : undefined;

    const settings = await this.repository.updateEmbedSettings(planGroupId, {
      ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
      ...(dto.layout !== undefined ? { layout: dto.layout } : {}),
      ...(dto.showMonthlyYearlyToggle !== undefined
        ? { showMonthlyYearlyToggle: dto.showMonthlyYearlyToggle }
        : {}),
      ...(dto.showFeatureComparison !== undefined
        ? { showFeatureComparison: dto.showFeatureComparison }
        : {}),
      ...(dto.showSetupFee !== undefined
        ? { showSetupFee: dto.showSetupFee }
        : {}),
      ...(dto.showTrialDays !== undefined
        ? { showTrialDays: dto.showTrialDays }
        : {}),
      ...(dto.showCapabilities !== undefined
        ? { showCapabilities: dto.showCapabilities }
        : {}),
      ...(dto.showTierFeatures !== undefined
        ? { showTierFeatures: dto.showTierFeatures }
        : {}),
      ...(customCss !== undefined ? { customCss } : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_embed.updated',
      entityType: 'PlanEmbedSettings',
      entityId: settings.id,
      metadata: { planGroupId, changes: dto },
    });

    return toPlanEmbedSettings(settings);
  }

  async buildPublicPricing(
    id: string,
    options?: { preview?: boolean },
  ): Promise<PublicPricingDto> {
    const group = await this.repository.findByIdForPricing(id);
    if (!group) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Pricing not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!options?.preview) {
      this.validation.assertPublicAccessible(group);
    }

    const embed = group.embedSettings;
    const rawDesignSettings = parsePlanGroupDesignSettings(
      group.designSettings,
    );
    const designSettings = resolvePlanGroupDesignSettings(
      group.designSettings,
      embed,
    );
    const billingCycles = Array.isArray(group.billingCycles)
      ? (group.billingCycles as string[])
      : ['MONTHLY', 'YEARLY'];

    const tiers = group.tiers
      .filter((tier) => {
        if (tier.deletedAt) return false;
        if (options?.preview) return true;
        return tier.status === PlanTierStatus.PUBLISHED;
      })
      .map((tier) => ({
        slug: tier.slug,
        name: tier.name,
        description: tier.description,
        priceMonthly: tier.priceMonthly?.toString() ?? null,
        priceYearly: tier.priceYearly?.toString() ?? null,
        setupFee: tier.setupFee?.toString() ?? null,
        trialDays: tier.trialDays,
        badge: tier.badge,
        highlighted: tier.highlighted,
        ctaLabel:
          tier.ctaLabel?.trim() ||
          group.defaultCtaLabel?.trim() ||
          'Get started',
        ctaUrl: tier.ctaUrl?.trim() || group.defaultCtaUrl?.trim() || '#',
        designSettings: parsePlanTierDesignSettings(tier.designSettings),
        capabilities: tier.capabilities
          .filter((a) => !a.capability.deletedAt)
          .map((a) => ({
            key: a.capability.key,
            name: a.capability.name,
            description: a.capability.description,
          })),
        features: tier.features.map((feature) => ({
          label: feature.label,
          description: feature.description,
          included: feature.included,
          icon: feature.icon,
        })),
      }));

    const featureRows = group.featureRows.map((row) => {
      const values: Record<string, { included: boolean; text?: string }> = {};
      if (
        row.values &&
        typeof row.values === 'object' &&
        !Array.isArray(row.values)
      ) {
        for (const [key, raw] of Object.entries(
          row.values as Record<string, unknown>,
        )) {
          if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
            const obj = raw as { included?: unknown; text?: unknown };
            values[key] = {
              included: Boolean(obj.included),
              ...(typeof obj.text === 'string' ? { text: obj.text } : {}),
            };
          }
        }
      }
      return {
        label: row.label,
        tooltip: row.tooltip,
        values,
      };
    });

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      currency: group.currency,
      billingCycles,
      embed: {
        theme: embed?.theme ?? 'LIGHT',
        layout: embed?.layout ?? 'CARDS',
        showMonthlyYearlyToggle: designSettings.showMonthlyYearlyToggle,
        showFeatureComparison: designSettings.showFeatureComparison,
        showSetupFee: designSettings.showSetupFee,
        showTrialDays: designSettings.showTrialDays,
        showCapabilities: designSettings.showCapabilities,
        showTierFeatures: designSettings.showTierFeatures,
      },
      designSettings,
      rawDesignSettings: Object.keys(rawDesignSettings).length
        ? rawDesignSettings
        : null,
      tiers,
      featureRows,
    };
  }

  async buildEmbedPricing(id: string): Promise<PublicPricingDto> {
    const group = await this.repository.findByIdForPricing(id);
    if (!group) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Pricing embed not found',
        HttpStatus.NOT_FOUND,
      );
    }
    this.validation.assertEmbedAccessible(group);
    return this.buildPublicPricing(id, { preview: false });
  }

  renderEmbedHtml(dto: PublicPricingDto, customCss?: string | null): string {
    const settings = dto.designSettings;
    const cssVars = designSettingsToCssVariables(settings);
    const rootVars = Object.entries(cssVars)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n    ');

    const safeCss = customCss ? this.sanitizeCssForInjection(customCss) : '';
    const dataJson = this.escapeJsonForScriptTag(JSON.stringify(dto));
    const tierCount = dto.tiers.length;
    const gridCols = embedGridColumns(settings.columns, tierCount);
    const isCompact = settings.layout === 'compact';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${this.escapeHtml(dto.name)} — Pricing</title>
  <style>
    :root {
    ${rootVars}
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: var(--plan-font-family); font-size: var(--plan-body-size); background: transparent; color: var(--plan-section-text); line-height: 1.5; }
    .wrap { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    h1 { display: ${settings.showPlanGroupTitle ? 'block' : 'none'}; margin: 0 0 8px; font-size: var(--plan-heading-size); font-weight: 700; letter-spacing: -0.02em; color: var(--plan-section-text); }
    .desc { display: ${settings.showPlanGroupDescription ? 'block' : 'none'}; color: var(--plan-section-muted); margin: 0 auto; max-width: 42rem; font-size: 1rem; }
    .toggle-wrap { display: flex; justify-content: center; margin-bottom: 32px; }
    .toggle { display: ${settings.showMonthlyYearlyToggle ? 'inline-flex' : 'none'}; gap: 4px; background: color-mix(in srgb, var(--plan-section-muted) 12%, var(--plan-card-bg)); border: 1px solid var(--plan-card-border); border-radius: 999px; padding: 4px; }
    .toggle button { border: none; background: transparent; color: var(--plan-section-muted); padding: 8px 18px; border-radius: 999px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background .15s, color .15s; }
    .toggle button.active { background: var(--plan-accent); color: #fff; }
    .tiers { display: grid; grid-template-columns: ${gridCols}; gap: ${isCompact ? '12px' : '20px'}; margin-bottom: 32px; }
    @media (max-width: 768px) { .tiers { grid-template-columns: 1fr; } }
    .tier { border: 1px solid var(--plan-tier-card-border, var(--plan-card-border)); border-radius: var(--plan-tier-card-radius, var(--plan-card-radius)); padding: ${isCompact ? '16px' : '24px'}; background: var(--plan-tier-card-bg, var(--plan-card-bg)); color: var(--plan-tier-card-text, var(--plan-card-text)); position: relative; display: flex; flex-direction: column; gap: var(--plan-tier-gap, 1.25em); box-shadow: var(--plan-tier-card-shadow, var(--plan-card-shadow)); width: 100%; max-width: var(--plan-card-max-width, none); justify-self: center; }
    .tier.highlighted { border-color: var(--plan-accent); box-shadow: 0 8px 24px color-mix(in srgb, var(--plan-accent) 20%, transparent), 0 0 0 1px var(--plan-accent); transform: translateY(-2px); }
    .badge { display: ${settings.showBadges ? 'inline-block' : 'none'}; align-self: flex-start; background: var(--plan-tier-badge-bg, var(--plan-accent)); color: var(--plan-tier-badge-text, #fff); font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 999px; margin: 0; letter-spacing: .02em; text-transform: uppercase; }
    .tier h3 { margin: 0; font-size: 1.25rem; font-weight: var(--plan-tier-name-weight, 700); font-style: var(--plan-tier-name-style, normal); text-align: var(--plan-tier-name-align, center); }
    .tier-desc { display: ${settings.showDescriptions ? 'block' : 'none'}; color: var(--plan-section-muted); font-size: 14px; margin: 0; min-height: 1.25em; text-align: var(--plan-desc-align, center); font-weight: var(--plan-desc-weight, 400); font-style: var(--plan-desc-style, normal); }
    .price-section { margin: 0; display: flex; flex-direction: column; gap: 0.35em; line-height: 1; }
    .price-block { text-align: var(--plan-price-align, center); margin: 0; }
    .price { font-size: 2.25rem; font-weight: var(--plan-price-weight, 700); font-style: var(--plan-price-style, normal); margin: 0; letter-spacing: -0.03em; line-height: 1; display: inline; }
    .price-period { color: var(--plan-section-muted); font-size: 1rem; font-weight: 400; line-height: 1; margin-left: 2px; }
    .cta-wrap { display: flex; justify-content: var(--plan-cta-justify, center); margin-top: 0; }
    .meta { color: var(--plan-section-muted); font-size: 13px; margin: 0; text-align: var(--plan-price-align, center); }
    ul.features { list-style: none; padding: 0; margin: 0; font-size: 14px; flex: 1; display: flex; flex-direction: column; gap: var(--plan-feature-list-gap, 0.5em); }
    ul.features li { display: flex; align-items: flex-start; gap: 8px; padding: 0; font-weight: var(--plan-tier-feature-list-weight, var(--plan-feature-list-weight, 400)); }
    ul.features li .icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: var(--plan-tier-feature-icon-size, var(--plan-feature-icon-size)); height: var(--plan-tier-feature-icon-size, var(--plan-feature-icon-size)); border-radius: 50%; background: var(--plan-tier-feature-icon-bg, var(--plan-feature-icon-bg)); color: var(--plan-tier-feature-icon, var(--plan-feature-icon)); font-weight: 700; font-size: calc(var(--plan-tier-feature-icon-size, var(--plan-feature-icon-size)) * 0.55); line-height: 1; text-align: center; }
    ul.features li.excluded { color: var(--plan-section-muted); text-decoration: line-through; }
    .caps { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; }
    .cap-chip { font-size: 12px; padding: 4px 10px; border-radius: 999px; background: color-mix(in srgb, var(--plan-accent) 15%, var(--plan-card-bg)); color: var(--plan-accent); border: 1px solid color-mix(in srgb, var(--plan-accent) 35%, transparent); }
    .cta { display: inline-block; text-align: center; padding: 12px 16px; background: var(--plan-tier-btn-bg, var(--plan-btn-bg)); color: var(--plan-tier-btn-text, var(--plan-btn-text)); text-decoration: none; border-radius: var(--plan-tier-btn-radius, var(--plan-btn-radius)); font-weight: var(--plan-cta-weight, 700); font-size: 14px; border: 1px solid var(--plan-tier-btn-bg, var(--plan-btn-bg)); transition: opacity .15s; }
    .cta-wrap.center .cta { width: 100%; }
    .cta.outline { background: transparent; color: var(--plan-tier-btn-text, var(--plan-accent)); border-color: var(--plan-tier-btn-text, var(--plan-accent)); }
    .cta:hover { opacity: .92; }
    table.compare { width: 100%; border-collapse: collapse; font-size: 14px; display: ${settings.showFeatureComparison && settings.layout === 'comparison' ? 'table' : 'none'}; margin-top: 16px; }
    table.compare th, table.compare td { border: 1px solid var(--plan-card-border); padding: 10px 12px; text-align: center; }
    table.compare th:first-child, table.compare td:first-child { text-align: left; }
    .yes { color: var(--plan-accent); font-weight: 600; }
    .no { color: var(--plan-section-muted); }
    ${safeCss}
  </style>
</head>
<body>
  <div class="wrap" id="root"></div>
  <script type="application/json" id="pricing-data">${dataJson}</script>
  <script>
(function () {
  var DATA = JSON.parse(document.getElementById("pricing-data").textContent);
  var cycle = DATA.billingCycles.indexOf("MONTHLY") >= 0 ? "MONTHLY" : "YEARLY";
  var currency = DATA.currency || "USD";
  var SETTINGS = DATA.designSettings || {};

  function fmt(amount) {
    if (amount == null || amount === "") return "—";
    var numeric = Number(amount);
    if (!isFinite(numeric)) return amount;
    try {
      var formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(numeric);
      return formatted.replace(new RegExp("\\\\s*" + currency + "\\\\s*$", "i"), "").trim();
    } catch (e) {
      try {
        var parts = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency,
          currencyDisplay: "narrowSymbol"
        }).formatToParts(0);
        var symbol = "$";
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].type === "currency") { symbol = parts[i].value; break; }
        }
        return symbol + amount;
      } catch (e2) {
        return amount;
      }
    }
  }

  function periodSuffix() {
    return cycle === "YEARLY" ? "/year" : "/month";
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function tierBadge(tier) {
    if (!SETTINGS.showBadges) return null;
    if (tier.badge) return tier.badge;
    return null;
  }

  function featureIcon(style, included) {
    if (!included || style === "none") return "";
    if (style === "dot") return "•";
    if (style === "plus") return "+";
    return "✓";
  }

  function featureIconSizePx(size) {
    if (size === "sm") return "16px";
    if (size === "lg") return "24px";
    return "20px";
  }

  function applyTierVars(card, tier) {
    var overrides = tier.designSettings || {};
    if (overrides.cardBackgroundColor) {
      card.style.setProperty("--plan-tier-card-bg", overrides.cardBackgroundColor);
    }
  }

  function render() {
    var root = document.getElementById("root");
    root.innerHTML = "";

    var header = el("div", "header");
    if (SETTINGS.showPlanGroupTitle) header.appendChild(el("h1", null, DATA.name));
    if (SETTINGS.showPlanGroupDescription && DATA.description) header.appendChild(el("p", "desc", DATA.description));
    if (header.childNodes.length) root.appendChild(header);

    if (SETTINGS.showMonthlyYearlyToggle && DATA.billingCycles.length > 1) {
      var toggleWrap = el("div", "toggle-wrap");
      var toggle = el("div", "toggle");
      ["MONTHLY", "YEARLY"].forEach(function (c) {
        if (DATA.billingCycles.indexOf(c) < 0) return;
        var btn = el("button", cycle === c ? "active" : "", c === "MONTHLY" ? "Monthly" : "Yearly");
        btn.onclick = function () { cycle = c; render(); };
        toggle.appendChild(btn);
      });
      toggleWrap.appendChild(toggle);
      root.appendChild(toggleWrap);
    }

    var tiersEl = el("div", "tiers");
    DATA.tiers.forEach(function (tier) {
      var card = el("div", "tier" + (tier.highlighted ? " highlighted" : ""));
      applyTierVars(card, tier);
      var badgeText = tierBadge(tier);
      if (badgeText) card.appendChild(el("span", "badge", badgeText));
      card.appendChild(el("h3", null, tier.name));
      var priceSection = el("div", "price-section");
      var price = cycle === "YEARLY" ? tier.priceYearly : tier.priceMonthly;
      var priceBlock = el("div", "price-block");
      var priceEl = el("div", "price", fmt(price));
      var periodEl = el("span", "price-period", periodSuffix());
      priceBlock.appendChild(priceEl);
      priceBlock.appendChild(periodEl);
      priceSection.appendChild(priceBlock);
      if (SETTINGS.showSetupFee && tier.setupFee) {
        priceSection.appendChild(el("div", "meta", "Setup fee: " + fmt(tier.setupFee)));
      }
      if (SETTINGS.showTrialDays && tier.trialDays) {
        priceSection.appendChild(el("div", "meta", tier.trialDays + "-day free trial"));
      }
      card.appendChild(priceSection);
      if (SETTINGS.showDescriptions && tier.description) card.appendChild(el("p", "tier-desc", tier.description));
      if (SETTINGS.showTierFeatures && tier.features && tier.features.length) {
        var ul = el("ul", "features");
        var iconStyle = (tier.designSettings && tier.designSettings.featureIconStyle) || SETTINGS.featureIconStyle || "check";
        tier.features.forEach(function (feature) {
          var li = el("li", feature.included ? "" : "excluded");
          var glyph = featureIcon(iconStyle, feature.included);
          if (glyph) li.appendChild(el("span", "icon", glyph));
          li.appendChild(el("span", null, feature.label));
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }
      if (SETTINGS.showCapabilities && tier.capabilities && tier.capabilities.length) {
        var caps = el("div", "caps");
        tier.capabilities.forEach(function (cap) {
          caps.appendChild(el("span", "cap-chip", cap.name));
        });
        card.appendChild(caps);
      }
      if (tier.ctaUrl) {
        var ctaWrap = el("div", "cta-wrap" + (SETTINGS.ctaAlignment === "center" ? " center" : ""));
        var a = document.createElement("a");
        var btnClass = "cta";
        if (SETTINGS.buttonStyle === "outline") btnClass += " outline";
        a.className = btnClass;
        a.href = tier.ctaUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = tier.ctaLabel || "Get started";
        ctaWrap.appendChild(a);
        card.appendChild(ctaWrap);
      }
      tiersEl.appendChild(card);
    });
    root.appendChild(tiersEl);

    if (SETTINGS.showFeatureComparison && SETTINGS.layout === "comparison" && DATA.featureRows && DATA.featureRows.length) {
      var table = el("table", "compare");
      var thead = document.createElement("thead");
      var hr = document.createElement("tr");
      hr.appendChild(el("th", null, "Feature"));
      DATA.tiers.forEach(function (t) { hr.appendChild(el("th", null, t.name)); });
      thead.appendChild(hr);
      table.appendChild(thead);
      var tbody = document.createElement("tbody");
      DATA.featureRows.forEach(function (row) {
        var tr = document.createElement("tr");
        tr.appendChild(el("td", null, row.label));
        DATA.tiers.forEach(function (t) {
          var val = row.values[t.slug] || { included: false };
          var cell = el("td", null, val.text || (val.included ? "✓" : "—"));
          if (val.included && !val.text) cell.className = "yes";
          if (!val.included && !val.text) cell.className = "no";
          tr.appendChild(cell);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      root.appendChild(table);
    }

    reportHeight();
  }

  function reportHeight() {
    var height = Math.ceil(document.documentElement.scrollHeight || document.body.scrollHeight || 0);
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "plan-pricing-widget:resize", height: height }, "*");
    }
  }

  render();
  window.addEventListener("resize", reportHeight);
})();
  </script>
</body>
</html>`;
  }

  private async requireGroup(planGroupId: string) {
    const group = await this.repository.findById(planGroupId);
    if (!group) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Plan group not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return group;
  }

  private async requireEmbedSettings(planGroupId: string) {
    const settings = await this.repository.findEmbedSettings(planGroupId);
    if (!settings) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Embed settings not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return settings;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeJsonForScriptTag(json: string): string {
    return json
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }

  private sanitizeCssForInjection(css: string): string {
    const lowered = css.toLowerCase();
    if (
      lowered.includes('<script') ||
      lowered.includes('@import') ||
      lowered.includes('url(')
    ) {
      return '';
    }
    return css;
  }
}
