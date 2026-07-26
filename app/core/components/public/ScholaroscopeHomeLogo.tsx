import Image from 'next/image';

type ScholaroscopeHomeLogoVariant = 'header' | 'auth';

interface ScholaroscopeHomeLogoProps {
  variant?: ScholaroscopeHomeLogoVariant;
  className?: string;
  showText?: boolean;
}

const variantClasses: Record<ScholaroscopeHomeLogoVariant, {
  root: string;
  image: string;
  width: number;
  height: number;
  text: string;
}> = {
  header: {
    root: 'inline-flex items-center gap-2 rounded-lg theme-focus-ring',
    image: 'h-9 w-9 rounded-lg object-cover',
    width: 36,
    height: 36,
    text: 'text-lg font-bold tracking-tight theme-text',
  },
  auth: {
    root: 'inline-flex flex-col items-center gap-3 rounded-xl theme-focus-ring',
    image: 'h-16 w-16 rounded-2xl object-cover shadow-sm',
    width: 64,
    height: 64,
    text: 'text-3xl font-bold tracking-tight theme-text',
  },
};

export function ScholaroscopeHomeLogo({
  variant = 'header',
  className = '',
  showText = true,
}: ScholaroscopeHomeLogoProps) {
  const classes = variantClasses[variant];

  return (
    // Native anchor is intentional here: logo navigation must reset cleanly to "/" without router state.
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a
      href="/"
      aria-label="Scholaroscope home"
      className={`${classes.root} ${className}`.trim()}
    >
      <Image
        src="/brand/scholaroscope-logo.jpeg"
        alt=""
        width={classes.width}
        height={classes.height}
        priority={variant === 'header'}
        className={classes.image}
      />
      {showText ? (
        <span className={classes.text}>Scholaroscope</span>
      ) : null}
    </a>
  );
}
