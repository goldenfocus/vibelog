"use client";

import { Navigation } from "@/components/Navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useI18n } from "@/components/providers/I18nProvider";

export default function FAQ() {
  const { t } = useI18n();
  
  const faqs = [
    { 
      question: t('pages.faq.questions.howItWorks.question'), 
      answer: t('pages.faq.questions.howItWorks.answer') 
    },
    { 
      question: t('pages.faq.questions.freePlan.question'), 
      answer: t('pages.faq.questions.freePlan.answer') 
    },
    { 
      question: t('pages.faq.questions.multiplePlatforms.question'), 
      answer: t('pages.faq.questions.multiplePlatforms.answer') 
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              {t('pages.faq.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('pages.faq.subtitle')}
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border/20 p-8">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-lg font-medium hover:text-electric transition-colors">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-4">{t('pages.faq.support.title')}</h2>
            <p className="text-muted-foreground mb-8">
              {t('pages.faq.support.description')}
            </p>
            <button className="bg-gradient-electric text-white px-8 py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity">
              {t('pages.faq.support.button')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
