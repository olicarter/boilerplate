import { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useOrg } from '../OrgContext';
import { orgsApi, topicsApi, proposalsApi } from '../api';
import { useCurrentUser } from '../context';
import { useToast } from '../components/Toast';
import { v4 as uuid } from 'uuid';

const STEPS = ['Invite members', 'First topic', 'First proposal', 'Done'];

export function SetupPage() {
  const { slug } = useParams({ from: '/orgs/$slug/setup' });
  const { org } = useOrg();
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const addToast = useToast();
  const [step, setStep] = useState(0);

  // Step 0: Invite
  const [inviteEmails, setInviteEmails] = useState('');
  const [sending, setSending] = useState(false);

  // Step 1: Topic
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [createdTopicId, setCreatedTopicId] = useState<string | null>(null);

  // Step 2: Proposal
  const [propTitle, setPropTitle] = useState('');
  const [propDesc, setPropDesc] = useState('');
  const [creatingProp, setCreatingProp] = useState(false);

  async function handleInvite() {
    const emails = inviteEmails.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean);
    if (!emails.length) { next(); return; }
    setSending(true);
    try {
      await Promise.all(emails.map((email) => orgsApi.sendInvite(slug, email)));
      addToast(`Invites sent to ${emails.length} member${emails.length > 1 ? 's' : ''}`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to send some invites', 'error');
    } finally {
      setSending(false);
      next();
    }
  }

  async function handleTopic() {
    if (!topicName.trim()) { next(); return; }
    setCreatingTopic(true);
    try {
      const result = await topicsApi.create({ id: uuid(), organisation_id: org.id, name: topicName.trim(), description: topicDesc.trim() });
      setCreatedTopicId(result.item.id);
      addToast('Topic created', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create topic', 'error');
    } finally {
      setCreatingTopic(false);
      next();
    }
  }

  async function handleProposal() {
    if (!propTitle.trim() || !createdTopicId) { next(); return; }
    setCreatingProp(true);
    try {
      await proposalsApi.create({
        id: uuid(),
        organisation_id: org.id,
        topic_id: createdTopicId,
        title: propTitle.trim(),
        description: propDesc.trim(),
        status: 'draft',
      });
      addToast('Proposal created as draft', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create proposal', 'error');
    } finally {
      setCreatingProp(false);
      next();
    }
  }

  function next() { setStep((s) => Math.min(s + 1, 3)); }
  function finish() { navigate({ to: '/orgs/$slug/proposals', params: { slug } }); }

  return (
    <div style={{ maxWidth: 520, margin: '3rem auto', padding: '0 1.5rem' }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem', alignItems: 'center' }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: i < STEPS.length - 1 ? 1 : undefined }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600,
              background: i <= step ? '#111' : '#eee',
              color: i <= step ? '#fff' : '#aaa',
              flexShrink: 0,
            }}>{i < step ? '✓' : i + 1}</div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? '#111' : '#eee' }} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 0.5rem' }}>Invite your members</h2>
          <p style={{ fontSize: 14, color: '#666', margin: '0 0 1.5rem', lineHeight: 1.6 }}>Enter email addresses to send invitations, or share your invite link.</p>
          <textarea
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
            placeholder="alice@example.com, bob@example.com"
            rows={3}
            style={{ width: '100%', padding: '0.5rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical', marginBottom: '0.75rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" disabled={sending} onClick={handleInvite}
              style={{ padding: '0.5rem 1.25rem', background: '#111', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, cursor: 'pointer' }}>
              {sending ? 'Sending…' : inviteEmails.trim() ? 'Send invites' : 'Skip'}
            </button>
            {inviteEmails.trim() && (
              <button type="button" onClick={next}
                style={{ padding: '0.5rem 1rem', background: 'none', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, cursor: 'pointer', color: '#666' }}>
                Skip
              </button>
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 0.5rem' }}>Create a topic</h2>
          <p style={{ fontSize: 14, color: '#666', margin: '0 0 1.5rem', lineHeight: 1.6 }}>Topics organise your proposals. You can add more later.</p>
          <input type="text" value={topicName} onChange={(e) => setTopicName(e.target.value)}
            placeholder="e.g. General, Budget, Policies"
            style={{ width: '100%', padding: '0.5rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box', marginBottom: '0.5rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" disabled={creatingTopic} onClick={handleTopic}
              style={{ padding: '0.5rem 1.25rem', background: '#111', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, cursor: 'pointer' }}>
              {creatingTopic ? 'Creating…' : topicName.trim() ? 'Create topic' : 'Skip'}
            </button>
            {topicName.trim() && (
              <button type="button" onClick={next}
                style={{ padding: '0.5rem 1rem', background: 'none', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, cursor: 'pointer', color: '#666' }}>
                Skip
              </button>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 0.5rem' }}>Create your first proposal</h2>
          <p style={{ fontSize: 14, color: '#666', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
            {!createdTopicId ? "You skipped creating a topic — you'll need to create one before adding proposals. Skip this step for now." : 'Start a draft — you can edit and publish it when ready.'}
          </p>
          {createdTopicId && (
            <>
              <input type="text" value={propTitle} onChange={(e) => setPropTitle(e.target.value)}
                placeholder="Proposal title"
                style={{ width: '100%', padding: '0.5rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box', marginBottom: '0.5rem' }} />
              <textarea value={propDesc} onChange={(e) => setPropDesc(e.target.value)}
                placeholder="Describe the proposal (optional)"
                rows={3}
                style={{ width: '100%', padding: '0.5rem', fontSize: 14, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical', marginBottom: '0.75rem' }} />
            </>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" disabled={creatingProp} onClick={createdTopicId ? handleProposal : next}
              style={{ padding: '0.5rem 1.25rem', background: '#111', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, cursor: 'pointer' }}>
              {creatingProp ? 'Creating…' : (createdTopicId && propTitle.trim()) ? 'Create draft' : 'Skip'}
            </button>
            {createdTopicId && propTitle.trim() && (
              <button type="button" onClick={next}
                style={{ padding: '0.5rem 1rem', background: 'none', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, cursor: 'pointer', color: '#666' }}>
                Skip
              </button>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: '1rem' }}>✓</div>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 0.75rem' }}>You're all set</h2>
          <p style={{ fontSize: 14, color: '#666', margin: '0 0 2rem', lineHeight: 1.6 }}>
            {org.name} is ready. Head to your proposals page to publish your first vote.
          </p>
          <button type="button" onClick={finish}
            style={{ padding: '0.6rem 1.5rem', background: '#111', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, cursor: 'pointer' }}>
            Go to proposals
          </button>
        </div>
      )}
    </div>
  );
}
