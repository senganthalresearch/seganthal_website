"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, Pause, Play, ShieldCheck, Star, TrendingUp, Users, X } from "lucide-react";
import styles from "./about.module.css";
import { bannerVisible, type AboutContent, type BannerContent } from "@/lib/site-settings";

type AboutMode = "page" | "section" | "dialog";

function compactLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function journeyItems(value: string) {
  const rows = compactLines(value).map((line) => {
    const [year, ...rest] = line.split("|");
    return { year: year.trim(), text: rest.join("|").trim() };
  });

  return rows.length ? rows : [{ year: "Now", text: "The community journey is being prepared." }];
}

export function Banner({ value }: { value: BannerContent }) {
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  if (!bannerVisible(value, now)) return null;

  return (
    <div className="community-banner" style={{ background: `linear-gradient(110deg,${value.colorStart},${value.colorEnd})`, color: value.textColor }}>
      <div className="banner-window">
        <div className={value.scroll ? "banner-text moving" : "banner-text"} style={{ animationDuration: `${value.speed}s`, animationPlayState: paused ? "paused" : "running" }}>
          {value.text}
        </div>
      </div>
      {value.scroll && (
        <button className="banner-pause" aria-label={paused ? "Play announcement" : "Pause announcement"} onClick={() => setPaused(!paused)}>
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      )}
    </div>
  );
}

export function AboutUs({ content, mode = "section" }: { content: AboutContent; mode?: AboutMode }) {
  const offers = compactLines(content.offers);
  const quotes = compactLines(content.quotes);
  const timeline = journeyItems(content.journey);
  const story = content.story || "Our story is being prepared. Come back soon to learn how our community began.";
  const rootClass = [styles.aboutStory, styles[mode]].join(" ");

  return (
    <article className={rootClass}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>
            <Star size={15} />
            Senganthal Research Community
          </span>
          <h2>Our story is built around patient learning.</h2>
          <p className={styles.tagline} lang="ta">
            {content.tagline}
          </p>
          <p className={styles.heroText}>
            A private investment family for people who want to understand companies, protect capital, and grow with calm research habits.
          </p>
          <a className={styles.heroLink} href="#about-programs">
            Explore programs <ArrowUpRight size={16} />
          </a>
        </div>

        <div className={styles.founderPanel}>
          <div className={styles.logoRow}>
            <img src="/senganthal-logo.jpg" alt="Senganthal logo" />
            <span>Research, learning, and community</span>
          </div>
          <div className={styles.founderPhotoWrap}>
            {content.photo ? <img src={content.photo} alt={content.founderName} /> : <span className={styles.founderAvatar}><Users size={40} /></span>}
          </div>
          <div className={styles.founderIdentity}>
            <span>Founder</span>
            <h3>{content.founderName}</h3>
            <p>{content.founderTitle}</p>
          </div>
        </div>
      </header>

      <section className={styles.statsStrip} aria-label="Community highlights">
        {[
          [content.members, "Members"],
          [content.founded, "Founded"],
          [content.programs, "Programs"],
        ].map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.storySection}>
          <span className={styles.sectionLabel}>How it started</span>
          <h3>Built for long-term clarity.</h3>
          <p className={styles.preserveLines}>{story}</p>
        </section>

        <section className={styles.timelineSection}>
          <span className={styles.sectionLabel}>Our journey</span>
          <ol>
            {timeline.map((item, index) => (
              <li key={`${item.year}-${index}`}>
                <strong>{item.year}</strong>
                {item.text && <span>{item.text}</span>}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className={styles.programs} id="about-programs">
        <div className={styles.sectionIntro}>
          <span className={styles.sectionLabel}>What we offer</span>
          <h3>Practical support for better decisions.</h3>
        </div>
        <div className={styles.offerGrid}>
          {offers.map((offer, index) => (
            <span key={offer}>
              {index % 3 === 0 ? <BookOpen size={17} /> : index % 3 === 1 ? <TrendingUp size={17} /> : <ShieldCheck size={17} />}
              {offer}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.quoteSection}>
        <div>
          <span className={styles.sectionLabel}>Founder note</span>
          <h3>Learn together. Invest with discipline.</h3>
        </div>
        <div className={styles.quoteStack}>
          {quotes.map((quote) => (
            <blockquote key={quote} lang="ta">
              {quote}
            </blockquote>
          ))}
        </div>
      </section>

      <footer className={styles.closing}>
        <span>{content.closing}</span>
      </footer>
    </article>
  );
}

export function AboutDialog({ content, onClose }: { content: AboutContent; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);

  return (
    <dialog ref={dialog} className={styles.storyDialog} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} aria-label="About Senganthal">
      <button autoFocus className={styles.storyClose} aria-label="Close About Us" onClick={onClose}>
        <X size={19} />
      </button>
      <AboutUs content={content} mode="dialog" />
    </dialog>
  );
}
