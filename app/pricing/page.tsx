"use client";

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

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
      popular: false
    },
    {
      name: t('pages.pricing.plans.influencer.name'),
      description: t('pages.pricing.plans.influencer.description'),
      price: t('pages.pricing.plans.influencer.price'),
      yearlyPrice: t('pages.pricing.plans.influencer.yearlyPrice'),
      features: t('pages.pricing.plans.influencer.features'),
      cta: t('pages.pricing.plans.influencer.cta'),
      popular: true
    },
    {
      name: t('pages.pricing.plans.agency.name'),
      description: t('pages.pricing.plans.agency.description'),
      price: t('pages.pricing.plans.agency.price'),
      yearlyPrice: t('pages.pricing.plans.agency.yearlyPrice'),
      features: t('pages.pricing.plans.agency.features'),
      cta: t('pages.pricing.plans.agency.cta'),
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              {t('pages.pricing.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              {t('pages.pricing.subtitle')}
            </p>
            
            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-12">
              <span className={`text-sm ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
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
                <span className="text-sm bg-electric/20 text-electric px-2 py-1 rounded-full">
                  Save ~30% with yearly
                </span>
              )}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-card rounded-2xl border p-8 ${
                  plan.popular
                    ? 'border-electric shadow-electric/20 shadow-2xl'
                    : 'border-border/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-electric text-white px-4 py-2 rounded-full text-sm font-medium">
                      {t('pages.pricing.plans.influencer.popular')}
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground mb-6">{plan.description}</p>
                  
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
                      <span className="text-muted-foreground">
                        {isYearly ? '/mo' : '/month'}
                      </span>
                    )}
                    {isYearly && plan.price !== t('pages.pricing.plans.casual.price') && (
                      <div className="text-sm text-muted-foreground mt-2">
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
                
                <div className="space-y-4">
                  {(() => {
                    try {
                      const features = plan.features;
                      if (Array.isArray(features) && features.length > 0) {
                        return features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-start space-x-3">
                            <Check className="w-5 h-5 text-electric mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{feature}</span>
                          </div>
                        ));
                      }
                      return <div>Loading features...</div>;
                    } catch (error) {
                      return <div>Loading...</div>;
                    }
                  })()}
                </div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-subtle rounded-3xl p-12 border border-border/20">
            <h2 className="text-3xl font-bold mb-4">
              {t('pages.pricing.cta.title')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              {t('pages.pricing.cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Button className="bg-gradient-electric hover:opacity-90 px-8 py-3">
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