import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';

export function CreateCampaignView() {
    const { createCampaign, status } = useCampaignFactory();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [target, setTarget] = useState('');
    const [duration, setDuration] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);

    const imagePreview = useMemo(() => (
        imageFile ? URL.createObjectURL(imageFile) : null
    ), [imageFile]);

    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim() && description.trim() && target && duration) {
            createCampaign(title.trim(), description.trim(), target, Number(duration), imageFile);
        }
    };

    useEffect(() => {
        if (status.isConfirmed) {
            navigate('/campaigns');
        }
    }, [status.isConfirmed, navigate]);

    const isProcessing = status.isCreating || status.isConfirming;

    return (
        <div className="fade-in">
            <button className="btn-back" onClick={() => navigate('/campaigns')}>
                Back to campaigns
            </button>

            <div className="create-campaign-shell">
                <div className="create-campaign-copy">
                    <div className="auth-kicker">Campaign studio</div>
                    <h2>Create a softer campaign card</h2>
                    <p>
                        Add the core campaign details here. Cover images are uploaded to Supabase storage, while the title, target, and timeline stay aligned with the contract flow.
                    </p>

                    <div className="create-campaign-preview-card">
                        <div className="create-campaign-preview-media">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Campaign preview" className="media-cover-image" />
                            ) : (
                                <div className="media-cover-placeholder">
                                    <span>Preview image</span>
                                    <small>Your uploaded campaign picture will appear here.</small>
                                </div>
                            )}
                        </div>

                        <div className="create-campaign-preview-content">
                            <span className="campaign-card-badge badge-active">Draft</span>
                            <h3>{title || 'Example Campaign for Pet Survey'}</h3>
                            <p>{description || 'Use a calm, descriptive summary so participants understand the goal immediately.'}</p>
                            <div className="campaign-card-stats">
                                <span><strong>{target || '0.00'}</strong> ETH target</span>
                                <span>{duration || '0'} days</span>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleCreate} className="create-form create-campaign-form">
                    <div className="form-group">
                        <label htmlFor="campaign-title">Title</label>
                        <input
                            id="campaign-title"
                            className="input"
                            placeholder="Campaign title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            disabled={isProcessing}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="campaign-description">Description</label>
                        <textarea
                            id="campaign-description"
                            className="input campaign-textarea"
                            placeholder="What is this campaign about?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            disabled={isProcessing}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="campaign-image">Campaign picture</label>
                        <input
                            id="campaign-image"
                            className="input"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                            disabled={isProcessing}
                        />
                        <p className="upload-help-text">Saved in Supabase storage after the contract deployment succeeds.</p>
                    </div>

                    <div className="create-campaign-grid">
                        <div className="form-group">
                            <label htmlFor="campaign-target">Target (ETH)</label>
                            <input
                                id="campaign-target"
                                className="input"
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="10"
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                                required
                                disabled={isProcessing}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="campaign-duration">Duration (days)</label>
                            <input
                                id="campaign-duration"
                                className="input"
                                type="number"
                                min="1"
                                placeholder="30"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                required
                                disabled={isProcessing}
                            />
                        </div>
                    </div>

                    <div className="create-campaign-actions">
                        <button className="btn-success" type="submit" disabled={isProcessing}>
                            {isProcessing ? 'Creating campaign...' : 'Create campaign'}
                        </button>
                        <button type="button" className="btn-ghost" onClick={() => navigate('/campaigns')} disabled={isProcessing}>
                            Cancel
                        </button>
                    </div>

                    {status.error && (
                        <p className="text-danger" style={{ textAlign: 'center' }}>{status.error.message}</p>
                    )}
                </form>
            </div>
        </div>
    );
}
