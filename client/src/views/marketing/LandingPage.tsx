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

function IconClipboard(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M9 4.5h6" />
            <path d="M9.8 3h4.4c.9 0 1.6.7 1.6 1.6V6H8.2V4.6C8.2 3.7 8.9 3 9.8 3Z" />
            <path d="M7 6h10a2 2 0 0 1 2 2v10.2a2.8 2.8 0 0 1-2.8 2.8H7.8A2.8 2.8 0 0 1 5 18.2V8a2 2 0 0 1 2-2Z" />
            <path d="M8.5 11.5h7" />
            <path d="M8.5 15.5h4.5" />
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

function IconShield(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M12 3 5 6v5.6c0 4.4 2.9 8.5 7 9.4 4.1-.9 7-5 7-9.4V6l-7-3Z" />
            <path d="m9.5 12.2 1.7 1.8 3.4-4" />
        </svg>
    );
}

const storyCards = [
    {
        title: 'Treatment support needs',
        body: 'Show the medical, recovery, and day-to-day support needs that make each treatment campaign urgent and understandable.',
        icon: IconPaw,
    },
    {
        title: 'Care and recovery updates',
        body: 'Highlight wellbeing, medication, follow-up care, and recovery progress in a format that feels human instead of clinical.',
        icon: IconHeart,
    },
    {
        title: 'Funding with transparency',
        body: 'Combine wallet-based donations, visible campaign progress, and reward claiming so supporters can trust how the campaign is managed.',
        icon: IconClipboard,
    },
];

const signalTracks = [
    'Treatment and medication',
    'Recovery and monitoring',
    'Emergency support needs',
    'Trust, rewards, and transparency',
];

const journeySteps = [
    {
        title: 'Connect your wallet',
        body: 'Enter the campaign through the participant portal and let the app recognize whether the wallet is already registered.',
    },
    {
        title: 'Support a treatment campaign',
        body: 'Review a treatment-focused campaign, understand the funding goal, and contribute directly through the on-chain donation flow.',
    },
    {
        title: 'Track and claim rewards',
        body: 'When participation qualifies, reward status becomes visible in the workspace and can be claimed through the existing on-chain flow.',
    },
];

const trustNotes = [
    'Clear treatment-focused storytelling',
    'Campaign-first presentation instead of generic donation UI',
    'Wallet-based participation with reward visibility',
];

export function LandingPage() {
    const navigate = useNavigate();
    const { isConnected } = useAccount();

    const primaryLabel = isConnected ? 'Open profile' : 'Connect wallet';
    const primaryAction = () => navigate(isConnected ? '/profile' : '/login');

    return (
        <div className="landing-page">
            <header className="landing-nav">
                <button type="button" className="landing-brand" onClick={() => navigate('/')}>
                    <span className="landing-brand-mark">
                        <IconPaw className="landing-icon" />
                    </span>
                    <span>
                        <strong>Pet Treatment Campaign</strong>
                        <small>Community insight portal</small>
                    </span>
                </button>

                <nav className="landing-nav-links" aria-label="Landing sections">
                    <a href="#mission">Mission</a>
                    <a href="#tracks">Treatment focus</a>
                    <a href="#journey">Journey</a>
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
                            Focused support for pet treatment funding
                        </div>

                        <h1>Pet Treatment Campaign</h1>
                        <p className="landing-hero-text">
                            A clearer campaign front page for raising support around treatment, recovery, and urgent pet care. The interface reads like a real funding campaign,
                            not a generic web3 workspace.
                        </p>

                        <div className="landing-hero-actions">
                            <button type="button" className="landing-hero-cta" onClick={primaryAction}>
                                {primaryLabel}
                            </button>
                            <button type="button" className="landing-secondary-link" onClick={() => navigate('/register')}>
                                Register member
                            </button>
                        </div>

                        <div className="landing-metrics" aria-label="Campaign metrics">
                            <div className="landing-metric">
                                <span>24/7</span>
                                <small>support-ready campaign access</small>
                            </div>
                            <div className="landing-metric">
                                <span>04</span>
                                <small>clear treatment focus areas</small>
                            </div>
                            <div className="landing-metric">
                                <span>CFR</span>
                                <small>reward-ready participation</small>
                            </div>
                        </div>
                    </div>

                    <div className="landing-hero-visual" aria-hidden="true">
                        <article className="hero-board hero-board-primary">
                            <div className="hero-board-topline">Campaign board</div>
                            <h2>What this treatment campaign supports</h2>
                            <div className="hero-topic-grid">
                                {signalTracks.map((item) => (
                                    <span key={item} className="hero-topic-chip">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </article>

                        <article className="hero-board hero-board-accent">
                            <div className="hero-mini-row">
                                <span className="hero-badge">Live flow</span>
                                <span className="hero-badge subtle">Wallet gated</span>
                            </div>
                            <strong>Treatment story first, web3 second</strong>
                            <p>The landing page leads with the treatment purpose, then routes users into the existing wallet and reward flow.</p>
                        </article>

                        <article className="hero-board hero-board-note">
                            <IconShield className="landing-inline-icon" />
                            <span>Reward visibility stays tied to the current on-chain manager and member profile.</span>
                        </article>
                    </div>
                </section>

                <section id="mission" className="landing-section landing-section-story">
                    <div className="landing-section-heading">
                        <span className="landing-section-label">Campaign direction</span>
                        <h2>Designed to feel like a living pet community campaign</h2>
                        <p>
                            The frontend uses warmer editorial styling, clearer hierarchy, and more specific treatment-oriented language so the product matches the title instead of feeling like a reused template.
                        </p>
                    </div>

                    <div className="landing-card-grid">
                        {storyCards.map(({ title, body, icon: Icon }) => (
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

                <section id="tracks" className="landing-section landing-section-grid">
                    <article className="landing-bento-main">
                        <span className="landing-section-label">Treatment focus</span>
                        <h2>Focused support areas, clearer campaign framing</h2>
                        <p>
                            Instead of a flat promotional block, the page now explains what supporters are helping fund and why each treatment area matters to the campaign owner.
                        </p>
                    </article>

                    <article className="landing-bento-aside">
                        <h3>Inside the current concept</h3>
                        <ul className="landing-list">
                            {signalTracks.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </article>

                    <article className="landing-bento-notes">
                        <h3>Why it feels fresher</h3>
                        <ul className="landing-note-list">
                            {trustNotes.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </article>
                </section>

                <section id="journey" className="landing-section">
                    <div className="landing-section-heading">
                        <span className="landing-section-label">Supporter journey</span>
                        <h2>The same product flow, presented with a stronger story</h2>
                    </div>

                    <div className="landing-step-grid">
                        {journeySteps.map((step, index) => (
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
                            <span className="landing-section-label">Launch-ready frontend</span>
                            <h2>Bring users into a pet-focused campaign, not a recycled workspace</h2>
                            <p>
                                The new direction is intentionally more expressive, more memorable, and more aligned with the product name while preserving the current routes, auth flow, and reward actions.
                            </p>
                        </div>

                        <div className="landing-cta-actions">
                            <button type="button" className="landing-hero-cta" onClick={primaryAction}>
                                {primaryLabel}
                            </button>
                            <button type="button" className="btn-ghost landing-nav-ghost" onClick={() => navigate('/campaigns')}>
                                View campaigns
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
