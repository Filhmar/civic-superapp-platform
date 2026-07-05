import { TenantConfig } from '@app/common';

/**
 * Seed tenants — the proof-of-pattern pair from the Reference doc. Every value
 * here is DATA: nothing in platform code refers to either tenant.
 */

export interface SeedTenant {
  id: string;
  kind: 'city';
  bundleId: string;
  name: string;
  config: TenantConfig;
}

export const MYDASMA: SeedTenant = {
  id: 'ph-cavite-dasmarinas',
  kind: 'city',
  bundleId: 'com.dasmarinas.app',
  name: 'MyDasma',
  config: {
    tenant_id: 'ph-cavite-dasmarinas',
    app: { name: 'MyDasma', tagline: 'Ang Lungsod sa Iyong Palad' },
    brand: {
      colors: {
        primary: '#1E8449',
        primaryDark: '#14532D',
        accent: '#F1C40F',
        accentDeep: '#D4A017',
        danger: '#E53935',
        tint: '#E8F5E9',
      },
      logo: {
        type: 'image',
        assets: {
          seal: '/assets/tenants/dasmarinas/seal.png',
          mascot: '/assets/tenants/dasmarinas/butterfly.png',
          watermark: '/assets/tenants/dasmarinas/watermark.png',
        },
      },
      slogan: 'Sulong na! Sulong pa!',
      executive: {
        title: 'City Mayor',
        name: 'Hon. Jenny Austria-Barzaga',
        photo: '/assets/tenants/dasmarinas/mayor.jpg',
        greeting:
          'Mabuhay, kababayan! Ang MyDasma ay para sa inyo — mabilis na serbisyo, sa iyong palad.',
      },
    },
    identifiers: { ticket_prefix: 'DSM', resident_id_prefix: 'DSM' },
    geo: {
      centroid: [14.3294, 120.9367],
      units: [
        'Zone I',
        'Zone II',
        'Zone III',
        'Zone IV',
        'Burol I',
        'Burol II',
        'Salitran I',
        'Salitran II',
        'Salitran III',
        'Salitran IV',
        'Paliparan I',
        'Paliparan II',
        'Paliparan III',
        'Sampaloc I',
        'Sampaloc II',
        'San Agustin I',
        'San Agustin II',
      ],
    },
    locales: ['en', 'fil'],
    onboarding: [
      {
        title: 'Serbisyo sa Iyong Palad',
        body: 'City services, permits, and payments — right from your phone.',
        bg: '#1E8449',
        image: '/assets/tenants/dasmarinas/onboarding-1.png',
      },
      {
        title: 'Ipaalam ang Problema',
        body: 'Report potholes, garbage, flooding and track your ticket to resolution.',
        bg: '#14532D',
        image: '/assets/tenants/dasmarinas/onboarding-2.png',
      },
      {
        title: 'Laging Handa',
        body: 'One-tap SOS with live location and city hotlines, online or offline.',
        bg: '#D4A017',
        image: '/assets/tenants/dasmarinas/onboarding-3.png',
      },
    ],
    home: { mayors_corner: true, digital_id_promo: true },
    modules: {
      egov: true,
      reports311: true,
      assistance: true,
      sos: true,
      news: true,
      tourism: true,
      directory: true,
      transport: true,
      health: false,
      jobs: false,
    },
    integrations: { weather: 'openweather', sms: 'semaphore', payments: ['gcash', 'card'] },
  },
};

export const MYSORSOGON: SeedTenant = {
  id: 'ph-sorsogon-sorsogoncity',
  kind: 'city',
  bundleId: 'com.sorsogon.app',
  name: 'MySorsogon',
  config: {
    tenant_id: 'ph-sorsogon-sorsogoncity',
    app: { name: 'MySorsogon', tagline: 'Ang Siyudad sa Iyong Palad' },
    brand: {
      colors: {
        primary: '#1B4F9C',
        primaryDark: '#123A75',
        accent: '#D62839',
        accentDeep: '#A31D2B',
        danger: '#E53935',
        tint: '#E8F0FB',
      },
      logo: {
        type: 'image',
        assets: {
          seal: '/assets/tenants/sorsogon/seal.png',
          mascot: '/assets/tenants/sorsogon/butanding.png',
          watermark: '/assets/tenants/sorsogon/watermark.png',
        },
      },
      slogan: 'Taas-Noo, Ciudadano Ako!',
      executive: {
        title: 'City Mayor',
        name: 'Hon. Ma. Ester E. Hamor',
        photo: '/assets/tenants/sorsogon/mayor.jpg',
        greeting:
          'Marhay na aldaw, mga ciudadano! An MySorsogon an saindong kaibahan sa serbisyong taas-noo.',
      },
    },
    identifiers: { ticket_prefix: 'SOR', resident_id_prefix: 'SOR' },
    geo: {
      centroid: [12.9714, 124.0064],
      units: [
        'Balogo',
        'Bibincahan',
        'Bitan-o/Dalipay',
        'Burabod',
        'Cabid-an',
        'Cambulaga',
        'Gimaloto',
        'Guinlajon',
        'Macabog',
        'Pangpang',
        'Piot',
        'Polvorista',
        'Salog',
        'Sirangan',
        'Talisay',
        'Tugos',
      ],
    },
    locales: ['en', 'fil'],
    onboarding: [
      {
        title: 'Serbisyong Taas-Noo',
        body: 'City services, permits, and payments — dignified, digital, at your fingertips.',
        bg: '#1B4F9C',
        image: '/assets/tenants/sorsogon/onboarding-1.png',
      },
      {
        title: 'Isumbong, Susundan',
        body: 'Report city issues with photos and location, and follow every step to resolution.',
        bg: '#123A75',
        image: '/assets/tenants/sorsogon/onboarding-2.png',
      },
      {
        title: 'Andam Kita',
        body: 'Hold-to-SOS with live location and complete city hotlines, even offline.',
        bg: '#D62839',
        image: '/assets/tenants/sorsogon/onboarding-3.png',
      },
    ],
    home: { mayors_corner: true, digital_id_promo: true },
    modules: {
      egov: true,
      reports311: true,
      assistance: true,
      sos: true,
      news: true,
      tourism: true,
      directory: true,
      transport: true,
      health: false,
      jobs: false,
    },
    integrations: { weather: 'openweather', sms: 'semaphore', payments: ['gcash', 'card'] },
  },
};

export const SEED_TENANTS: SeedTenant[] = [MYDASMA, MYSORSOGON];
