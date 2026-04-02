import type { SVGProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';

type IconProps = SVGProps<SVGSVGElement>;

function IconPaw(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M5.2 11.2c-.9 0-1.7-.9-1.7-2.1s.8-2.1 1.7-2.1 1.7.9 1.7 2.1-.8 2.1-1.7 2.1Z" />
            <path d="M9.1 7.3c-1 0-1.8-1-1.8-2.3S8.1 2.7 9.1 2.7s1.8 1 1.8 2.3-.8 2.3-1.8 2.3Z" />
            <path d="M14.9 7.3c1 0 1.8-1 1.8-2.3s-.8-2.3-1.8-2.3-1.8 1-1.8 2.3.8 2.3 1.8 2.3Z" />
            <path d="M18.8 11.2c.9 0 1.7-.9 1.7-2.1S19.7 7 18.8 7s-1.7.9-1.7 2.1.8 2.1 1.7 2.1Z" />
            <path d="M12 20.5c4 0 6.3-1.8 6.3-4 0-1.8-1.6-3.2-3.2-3.2-1.2 0-2.1.7-3.1 1.6-1-1-1.9-1.6-3.1-1.6-1.6 0-3.2 1.4-3.2 3.2 0 2.2 2.3 4 6.3 4Z" />
        </svg>
    );
}

function IconSpark(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="m12 3 1.7 4.8L18.5 9l-4.8 1.2L12 15l-1.7-4.8L5.5 9l4.8-1.2L12 3Z" />
            <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
            <path d="m5 14 1 2.8L8.8 18 6 19l-1 2.8L4 19l-2.8-1L4 16.8 5 14Z" />
        </svg>
    );
}

function IconShield(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M12 3 5 6v5.6c0 4.4 2.9 8.5 7 9.4 4.1-.9 7-5 7-9.4V6l-7-3Z" />
            <path d="m9.5 12.2 1.7 1.8 3.4-4" />
        </svg>
    );
}

function IconChart(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M4 19V5" />
            <path d="M4 19h16" />
            <path d="m7 15 3-4 3 2 4-6" />
            <path d="m17 7 0 3h3" />
        </svg>
    );
}

function IconHeart(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M12 20s-6.7-4.3-8.6-8c-1.6-3 .3-6.8 3.9-7.3 2-.3 3.6.5 4.7 2 1.1-1.5 2.7-2.3 4.7-2 3.6.5 5.5 4.3 3.9 7.3-1.9 3.7-8.6 8-8.6 8Z" />
        </svg>
    );
}

const highlights = [
    {
        title: 'A softer way to support research',
        body: 'The campaign is built to gather honest pet-owner feedback without making the experience feel clinical or overwhelming.',
        icon: IconHeart,
    },
    {
        title: 'Clear survey topics',
        body: 'Questions are grouped around daily care, routines, wellbeing, and adoption support so participants can answer quickly and confidently.',
        icon: IconChart,
    },
    {
        title: 'Trusted reward flow',
        body: 'Participants can join with their wallet, support the campaign, and claim rewards through the on-chain reward manager once eligible.',
        icon: IconShield,
    },
];

const surveyCards = [
    'Pet routines and home habits',
    'Health, nutrition, and comfort',
    'Adoption support and rescue insights',
    'Community expectations and trust signals',
];

const steps = [
    {
        title: 'Connect',
        body: 'Open the participant portal, connect a wallet, and enter the campaign flow in a few taps.',
    },
    {
        title: 'Participate',
        body: 'Review the campaign, contribute if relevant, and move through a calm, easy-to-scan survey experience.',
    },
    {
        title: 'Claim',
        body: 'Eligible reward balance appears in your profile, where CFR can be claimed through the reward manager.',
    },
];

export function LandingPage() {
    const navigate = useNavigate();
    const { isConnected } = useAccount();

    const primaryLabel = isConnected ? 'Open dashboard' : 'Connect wallet';
    const primaryAction = () => navigate(isConnected ? '/dashboard' : '/login');

    return (
        <div className="landing-page">
            <header className="landing-nav">
                <button type="button" className="landing-brand" onClick={() => navigate('/')}>
                    <span className="landing-brand-mark">
                        <IconPaw className="landing-icon" />
                    </span>
                    <span>
                        <strong>Example Campaign</strong>
                        <small>for Pet Survey</small>
                    </span>
                </button>

                <nav className="landing-nav-links" aria-label="Landing sections">
                    <a href="#overview">Overview</a>
                    <a href="#survey">Survey</a>
                    <a href="#process">Process</a>
                </nav>

                <div className="landing-nav-actions">
                    <button type="button" className="btn-ghost landing-nav-ghost" onClick={() => navigate('/login')}>
                        Participant portal
                    </button>
                    <button type="button" className="landing-nav-cta" onClick={primaryAction}>
                        {primaryLabel}
                    </button>
                </div>
            </header>

            <main className="landing-main">
                <section className="landing-hero">
                    <div className="landing-hero-copy">
                        <div className="landing-eyebrow">
                            <IconSpark className="landing-inline-icon" />
                            Calm, clear, pet-first campaign design
                        </div>
                        <h1>Example Campaign for Pet Survey</h1>
                        <p className="landing-hero-text">
                            A modern, friendly campaign page designed to help pet owners share thoughtful feedback with confidence. The experience is clean,
                            trustworthy, and reward-aware from the first impression to the final claim.
                        </p>

                        <div className="landing-hero-actions">
                            <button type="button" className="landing-hero-cta" onClick={primaryAction}>
                                {primaryLabel}
                            </button>
                            <a className="landing-text-link" href="#overview">
                                Explore the campaign
                            </a>
                        </div>

                        <div className="landing-metrics" aria-label="Campaign highlights">
                            <div className="landing-metric">
                                <span>5 min</span>
                                <small>gentle survey flow</small>
                            </div>
                            <div className="landing-metric">
                                <span>4 themes</span>
                                <small>clear response sections</small>
                            </div>
                            <div className="landing-metric">
                                <span>1:1 CFR</span>
                                <small>reward balance logic</small>
                            </div>
                        </div>
                    </div>

                    <div className="landing-hero-visual" aria-hidden="true">
                        <div className="hero-card hero-card-primary">
                            <div className="hero-card-label">Survey snapshot</div>
                            <h2>Help shape a calmer pet care experience</h2>
                            <ul>
                                {surveyCards.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="hero-card hero-card-float">
                            <div className="hero-mini-row">
                                <span className="hero-badge">Live rewards</span>
                                <span className="hero-badge subtle">On-chain</span>
                            </div>
                            <strong>Profile-ready reward claims</strong>
                            <p>Once participation is recorded, claimable CFR appears in the participant profile.</p>
                        </div>

                        <div className="hero-card hero-card-note">
                            <IconShield className="landing-inline-icon" />
                            <span>Only authorized campaign contracts can record rewardable donations.</span>
                        </div>
                    </div>
                </section>

                <section id="overview" className="landing-section">
                    <div className="landing-section-heading">
                        <span className="landing-section-label">Why this page works</span>
                        <h2>A calmer structure for a softer campaign story</h2>
                        <p>
                            The page is intentionally light, breathable, and modular so visitors can understand the campaign quickly without getting lost in dense blocks or heavy UI.
                        </p>
                    </div>

                    <div className="landing-card-grid">
                        {highlights.map(({ title, body, icon: Icon }) => (
                            <article key={title} className="landing-feature-card">
                                <div className="landing-feature-icon">
                                    <Icon className="landing-icon" />
                                </div>
                                <h3>{title}</h3>
                                <p>{body}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section id="survey" className="landing-section landing-section-soft">
                    <div className="landing-bento">
                        <article className="landing-bento-main">
                            <span className="landing-section-label">Survey focus</span>
                            <h2>Designed around real pet-owner questions</h2>
                            <p>
                                Instead of presenting a generic donation interface, this landing page frames the campaign around practical input: what pets need, where owners need support,
                                and which signals make a survey feel respectful and worth completing.
                            </p>
                        </article>

                        <article className="landing-bento-aside">
                            <h3>Inside the experience</h3>
                            <ul className="landing-list">
                                {surveyCards.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </article>
                    </div>
                </section>

                <section id="process" className="landing-section">
                    <div className="landing-section-heading">
                        <span className="landing-section-label">Participation flow</span>
                        <h2>Easy to follow from first click to reward claim</h2>
                    </div>

                    <div className="landing-step-grid">
                        {steps.map((step, index) => (
                            <article key={step.title} className="landing-step-card">
                                <div className="landing-step-number">0{index + 1}</div>
                                <h3>{step.title}</h3>
                                <p>{step.body}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="landing-section">
                    <div className="landing-cta-panel">
                        <div>
                            <span className="landing-section-label">Ready to launch</span>
                            <h2>Bring the campaign into a cleaner, more premium flow</h2>
                            <p>
                                The landing page now introduces the campaign clearly, makes the primary call-to-action obvious, and supports the current on-chain reward setup without visual clutter.
                            </p>
                        </div>
                        <div className="landing-cta-actions">
                            <button type="button" className="landing-hero-cta" onClick={primaryAction}>
                                {primaryLabel}
                            </button>
                            <button type="button" className="btn-ghost landing-nav-ghost" onClick={() => navigate('/register')}>
                                Register a participant wallet
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
