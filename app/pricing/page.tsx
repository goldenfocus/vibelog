'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';

import Navigation from '@/components/Navigation';
import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';

export default function Pricing() {
  const { t } = useI18n();
  const [isYearly, setIsYearly] = useState(true);

  const plans = [
    {
      name: t('pages.pricing.plans.casual.name'),
      description: t('pages.pricing.plans.casual.description'),
      price: t('pages.pricing.plans.casual.price'),
      yearlyPrice: t('pages.pricing.plans.casual.price'),
      features: t('pages.pricing.plans.casual.features'),
      cta: t('pages.pricing.plans.casual.cta'),
      popular: false,
    },
    {
      name: t('pages.pricing.plans.influencer.name'),
      description: t('pages.pricing.plans.influencer.description'),
      price: t('pages.pricing.plans.influencer.price'),
      yearlyPrice: t('pages.pricing.plans.influencer.yearlyPrice'),
      features: t('pages.pricing.plans.influencer.features'),
      cta: t('pages.pricing.plans.influencer.cta'),
      popular: true,
    },
    {
      name: t('pages.pricing.plans.agency.name'),
      description: t('pages.pricing.plans.agency.description'),
      price: t('pages.pricing.plans.agency.price'),
      yearlyPrice: t('pages.pricing.plans.agency.yearlyPrice'),
      features: t('pages.pricing.plans.agency.features'),
      cta: t('pages.pricing.plans.agency.cta'),
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h1 className="mb-6 text-4xl font-bold sm:text-5xl" style={{ minHeight: '60px' }}>
              {t('pages.pricing.title')}
            </h1>
            <p
              className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground"
              style={{ minHeight: '60px' }}
            >
              {t('pages.pricing.subtitle')}
            </p>

            {/* Billing Toggle */}
            <div className="mb-12 flex items-center justify-center space-x-4">
              <span
                className={`text-sm ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {t('pages.pricing.billing.monthly')}
              </span>
              <button
                onClick={() => setIsYearly(!isYearly)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isYearly ? 'bg-electric' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isYearly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                {t('pages.pricing.billing.yearly')}
              </span>
              {isYearly && (
                <span className="rounded-full bg-electric/20 px-2 py-1 text-sm text-electric">
                  {t('pages.pricing.billing.yearlyDiscount')}
                </span>
              )}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="mb-16 grid gap-8 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-2xl border bg-card p-8 ${
                  plan.popular
                    ? 'border-electric shadow-2xl shadow-electric/20'
                    : 'border-border/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
                    <span className="rounded-full bg-gradient-electric px-4 py-2 text-sm font-medium text-white">
                      {t('pages.pricing.plans.influencer.popular')}
                    </span>
                  </div>
                )}

                <div className="mb-8 text-center">
                  <h3 className="mb-2 text-2xl font-bold" style={{ minHeight: '40px' }}>
                    {plan.name}
                  </h3>
                  <p className="mb-6 text-muted-foreground" style={{ minHeight: '50px' }}>
                    {plan.description}
                  </p>

                  <div className="mb-6">
                    <span className="text-4xl font-bold">
                      {(() => {
                        if (plan.price === t('pages.pricing.plans.casual.price')) {
                          return plan.price; // Free plan
                        } else if (plan.name === t('pages.pricing.plans.influencer.name')) {
                          return isYearly ? '$9' : '$12';
                        } else if (plan.name === t('pages.pricing.plans.agency.name')) {
                          return isYearly ? '$60' : '$99';
                        }
                        return isYearly ? plan.yearlyPrice : plan.price;
                      })()}
                    </span>
                    {plan.price !== t('pages.pricing.plans.casual.price') && (
                      <span className="text-muted-foreground">{isYearly ? '/mo' : '/month'}</span>
                    )}
                    {isYearly && plan.price !== t('pages.pricing.plans.casual.price') && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <div>billed yearly</div>
                        <div className="mt-1">
                          {plan.name === t('pages.pricing.plans.influencer.name') && '$99/year'}
                          {plan.name === t('pages.pricing.plans.agency.name') && '$690/year'}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    className={`w-full ${
                      plan.popular
                        ? 'bg-gradient-electric hover:opacity-90'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </div>

                <div className="space-y-4" style={{ minHeight: '300px' }}>
                  {(() => {
                    try {
                      const features = plan.features;
                      if (Array.isArray(features) && features.length > 0) {
                        return features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-start space-x-3">
                            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-electric" />
                            <span className="text-sm text-muted-foreground">{feature}</span>
                          </div>
                        ));
                      }
                      return <div>{t('common.loading')}</div>;
                    } catch {
                      return <div>{t('common.loading')}</div>;
                    }
                  })()}
                </div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="rounded-3xl border border-border/20 bg-gradient-subtle p-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">{t('pages.pricing.cta.title')}</h2>
            <p className="mb-8 text-xl text-muted-foreground">{t('pages.pricing.cta.subtitle')}</p>
            <div className="flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
              <Button className="bg-gradient-electric px-8 py-3 hover:opacity-90">
                {t('pages.pricing.cta.startTrial')}
              </Button>
              <Button variant="outline" className="px-8 py-3">
                {t('pages.pricing.cta.viewDemo')}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
