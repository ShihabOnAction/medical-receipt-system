import { Outlet, Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import ThemeMenu from './ThemeMenu.jsx';

/**
 * Split screen used by sign-in, registration and the pending-approval page.
 *
 * The left panel carries the hospital's identity and nothing else: name and
 * department at the top, the neurology artwork in the middle, address at the
 * foot. The artwork sits on a dark brand-tinted ground so its own black
 * background disappears into the panel instead of reading as a pasted-in box.
 */
export function AuthLayout() {
  const { settings } = useSettings();

  return (
    <div className="flex min-h-screen bg-surface-sunken">
      <div
        className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{
          backgroundImage:
            'linear-gradient(155deg, rgb(var(--brand-900)) 0%, #060b16 45%, #04070f 100%)',
        }}
      >
        {/* brand glow behind the artwork */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 52%, rgb(var(--brand-500) / 0.28) 0%, transparent 70%)',
          }}
        />

        <div className="relative flex items-center gap-3">
          <img
            src={settings.logoUrl || '/logo.png'}
            alt=""
            className="h-12 w-12 rounded bg-white/90 object-contain p-1"
          />
          <div>
            <p className="text-lg font-semibold leading-tight">{settings.hospitalName}</p>
            <p className="text-sm text-white/80">{settings.departmentName}</p>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center py-8">
          <img
            src="/brain.jpg"
            alt=""
            loading="lazy"
            className="w-[124%] max-w-none object-contain"
            style={{
              // `screen` drops the artwork's black ground entirely, and the
              // radial mask feathers the edges so no rectangle is visible
              // against the panel.
              mixBlendMode: 'screen',
              maskImage: 'radial-gradient(ellipse 68% 62% at 50% 50%, #000 48%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 68% 62% at 50% 50%, #000 48%, transparent 100%)',
            }}
          />
        </div>

        <p className="relative text-xs text-white/60">
          {settings.hospitalAddress} · {new Date().getFullYear()}
        </p>
      </div>

      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2 lg:invisible">
            <img src={settings.logoUrl || '/logo.png'} alt="" className="h-8 w-8 object-contain" />
            <span className="text-sm font-semibold text-ink">{settings.hospitalName}</span>
          </Link>
          <ThemeMenu />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-10">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
