export const siteBrand = {
  name: 'Ambertinybear',
  tagline: 'handmade with care',
  description: 'Handmade crochet toys, dolls, and patterns by Ambertinybear.',
  logo: {
    src: '/images/brand/logo.webp',
    alt: 'Ambertinybear logo',
    width: 180,
    height: 80
  }
} as const;

export const siteSocialLinks = [
  {
    id: 'facebook',
    label: 'Facebook',
    href: 'https://facebook.com/ambertinybear',
    icon: '/images/social/facebook.png'
  },
  {
    id: 'instagram',
    label: 'Instagram',
    href: 'https://instagram.com/ambertinybear',
    icon: '/images/social/instagram.png'
  },
  {
    id: 'etsy',
    label: 'Etsy',
    href: 'https://etsy.com/shop/ambertinybear',
    icon: '/images/social/etsy.png'
  }
] as const;
