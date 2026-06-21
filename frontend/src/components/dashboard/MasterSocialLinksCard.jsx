import Input from '../ui/Input';
import { MASTER_SOCIAL_FIELDS } from '../../lib/socialLinks';
import { IconTelegram, IconVk, IconInstagram } from '../brand/SocialBrandIcons';
import MaxLogo from '../brand/MaxLogo';
import { Globe } from 'lucide-react';

function FieldIcon({ fieldKey, className = 'h-5 w-5' }) {
  switch (fieldKey) {
    case 'social_telegram': return <IconTelegram className={className} alt="" />;
    case 'social_instagram': return <IconInstagram className={className} alt="" />;
    case 'social_vk': return <IconVk className={className} alt="" />;
    case 'social_max': return <MaxLogo className={className} alt="" />;
    case 'social_website': return <Globe className={`${className} text-violet-500`} strokeWidth={2} />;
    default: return null;
  }
}

function getAccentColor(fieldKey) {
  switch (fieldKey) {
    case 'social_telegram': return 'text-blue-500';
    case 'social_instagram': return 'text-pink-500';
    case 'social_vk': return 'text-blue-600';
    case 'social_max': return 'text-purple-500';
    case 'social_website': return 'text-violet-500';
    default: return 'text-gray-400';
  }
}

export default function MasterSocialLinksCard({ form, onChange }) {
  return (
    <div className="w-full min-w-0" style={{ boxSizing: 'border-box' }}>
      <div className="space-y-4">
        {MASTER_SOCIAL_FIELDS.map((field) => (
          <div key={field.key} className="min-w-0">
            <label className="block text-sm font-semibold text-admin-text mb-2">
              <span className={`inline-flex items-center gap-1.5 ${getAccentColor(field.key)}`}>
                <FieldIcon fieldKey={field.key} />
                {field.label}
              </span>
            </label>
            <input
              type="url"
              value={form[field.key] || ''}
              onChange={(e) => onChange({ ...form, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="block w-full h-11 px-3.5 rounded-xl border border-admin-border bg-white text-admin-text text-sm placeholder:text-admin-textMuted focus:outline-none focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20 transition shadow-sm"
              style={{ boxSizing: 'border-box', maxWidth: '100%' }}
            />
            {field.hint && (
              <p className="mt-1 text-xs text-admin-textMuted">{field.hint}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
