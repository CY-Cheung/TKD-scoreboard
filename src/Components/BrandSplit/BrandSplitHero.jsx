import React from "react";
import { Github } from "react-bootstrap-icons";
import { StableLocaleText } from "../AlternatingLocale/AlternatingLocale";
import { LANDING_FEATURES, LANDING_HERO } from "../../constants/landingFeatures";

/**
 * Shared left brand panel (Home + CourtSetup).
 */
export default function BrandSplitHero({ locale, visible }) {
  return (
    <div className="brand-split-hero">
      <div className="brand-split-title-block">
        <StableLocaleText
          as="h1"
          locale={locale}
          visible={visible}
          className="brand-split-hero-title"
          en={LANDING_HERO.titleEn}
          zh={LANDING_HERO.titleZh}
        />
        <StableLocaleText
          as="p"
          locale={locale}
          visible={visible}
          className="brand-split-subtitle"
          en={LANDING_HERO.subtitleEn}
          zh={LANDING_HERO.subtitleZh}
        />
        <ul className="brand-split-intro-list">
          {LANDING_FEATURES.map(({ id, titleEn, titleZh, en, zh }) => (
            <li key={id} className="brand-split-intro-item">
              <StableLocaleText
                as="div"
                locale={locale}
                visible={visible}
                className="brand-split-intro-title"
                en={titleEn}
                zh={titleZh}
              />
              <StableLocaleText
                as="div"
                locale={locale}
                visible={visible}
                className="brand-split-intro-desc"
                en={en}
                zh={zh}
              />
            </li>
          ))}
        </ul>
      </div>
      <div className="brand-split-footer-links">
        <a
          href="https://github.com/CY-Cheung/TKD-scoreboard"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Github size="1.04cqi" /> GitHub Repository
        </a>
      </div>
    </div>
  );
}
