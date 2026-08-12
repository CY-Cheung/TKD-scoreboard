import React from "react";
import { Github } from "react-bootstrap-icons";
import { StableLocaleText } from "../../Components/AlternatingLocale/AlternatingLocale";
import { LANDING_FEATURES, LANDING_HERO } from "../../constants/landingFeatures";

/**
 * CourtSetup left hero: brand title, feature list, GitHub footer.
 * CSS classes stay in CourtSetup.css (`.cs-left-panel` etc.).
 */
export default function CourtSetupHeroPanel({ locale, visible }) {
  return (
    <div className="cs-left-panel">
      <div className="cs-title-container">
        <StableLocaleText
          as="h1"
          locale={locale}
          visible={visible}
          className="cs-hero-title"
          en={LANDING_HERO.titleEn}
          zh={LANDING_HERO.titleZh}
        />
        <StableLocaleText
          as="p"
          locale={locale}
          visible={visible}
          className="cs-subtitle"
          en={LANDING_HERO.subtitleEn}
          zh={LANDING_HERO.subtitleZh}
        />
        <ul className="cs-app-intro-list">
          {LANDING_FEATURES.map(({ id, titleEn, titleZh, en, zh }) => (
            <li key={id} className="cs-app-intro-item">
              <StableLocaleText
                as="div"
                locale={locale}
                visible={visible}
                className="cs-app-intro-title"
                en={titleEn}
                zh={titleZh}
              />
              <StableLocaleText
                as="div"
                locale={locale}
                visible={visible}
                className="cs-app-intro-desc"
                en={en}
                zh={zh}
              />
            </li>
          ))}
        </ul>
      </div>
      <div className="cs-footer-links">
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
