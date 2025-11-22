'use client';

import emailjs from '@emailjs/browser';
import { ChevronDown, Mail, Send } from 'lucide-react';
import React, { useState } from 'react';

import Navigation from '@/components/Navigation';
import { useI18n } from '@/components/providers/I18nProvider';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ() {
  const { t } = useI18n();
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  // Initialize EmailJS
  React.useEffect(() => {
    emailjs.init(process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!);
  }, []);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const faqData: FAQItem[] = Array.isArray(t('pages.faq.items') as unknown as FAQItem[])
    ? (t('pages.faq.items') as unknown as FAQItem[]) || []
    : [];

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleItem(index);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const templateParams = {
        from_name: formData.name,
        from_email: formData.email,
        message: formData.message,
        to_name: 'VibeLog Support',
      };

      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        templateParams
      );

      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Error sending email:', error);
      console.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-16 text-center">
            <h1
              className="mb-6 bg-gradient-electric bg-clip-text text-4xl font-bold text-transparent sm:text-5xl"
              style={{ minHeight: '60px' }}
            >
              {t('pages.faq.title')}
            </h1>
            <p
              className="mx-auto max-w-2xl text-xl text-muted-foreground"
              style={{ minHeight: '60px' }}
            >
              {t('pages.faq.subtitle')}
            </p>
          </div>

          {/* FAQ Accordion */}
          <h2 className="sr-only">{t('pages.faq.title')}</h2>
          <div className="mb-16 space-y-4">
            {Array.isArray(faqData) &&
              faqData.map((item, index) => {
                const isOpen = openItems.has(index);
                return (
                  <div
                    key={index}
                    className="overflow-hidden rounded-2xl border border-border/20 bg-card/50 backdrop-blur-sm transition-all duration-200 hover:bg-card/70"
                  >
                    <button
                      onClick={() => toggleItem(index)}
                      onKeyDown={e => handleKeyDown(e, index)}
                      className="flex w-full items-center justify-between p-6 text-left transition-colors focus:bg-card/80 focus:outline-none focus:ring-2 focus:ring-electric/20"
                      aria-expanded={isOpen}
                      aria-controls={`faq-content-${index}`}
                    >
                      <h3 className="pr-4 text-lg font-semibold text-foreground">
                        {item.question}
                      </h3>
                      <ChevronDown
                        className={`h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
                          isOpen ? 'rotate-180 transform' : ''
                        }`}
                      />
                    </button>
                    <div
                      id={`faq-content-${index}`}
                      className={`transition-all duration-200 ease-in-out ${
                        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      } overflow-hidden`}
                    >
                      <div className="px-6 pb-6">
                        <div className="border-t border-border/10 pt-2">
                          <p className="mt-4 leading-relaxed text-muted-foreground">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Support CTA */}
          <div className="rounded-3xl border border-border/20 bg-gradient-to-br from-card/40 to-card/20 p-8 backdrop-blur-sm sm:p-12">
            <div className="mx-auto max-w-2xl">
              <div className="mb-8 text-center">
                <h2
                  className="mb-2 text-2xl font-bold text-foreground"
                  style={{ minHeight: '40px' }}
                >
                  {t('pages.faq.support.title')}
                </h2>
              </div>

              {!showForm && !submitted && (
                <div className="text-center">
                  <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex transform items-center gap-2 rounded-2xl bg-gradient-electric px-8 py-4 font-semibold text-white transition-all duration-200 hover:scale-105 hover:opacity-90 focus:scale-105 focus:outline-none focus:ring-2 focus:ring-electric/20"
                  >
                    <Mail className="h-5 w-5" />
                    {t('pages.faq.support.button')}
                  </button>
                </div>
              )}

              {showForm && !submitted && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="name"
                        className="mb-2 block text-sm font-medium text-foreground"
                      >
                        {t('pages.faq.form.nameLabel')}
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-xl border border-border/20 bg-background/50 px-4 py-3 text-foreground placeholder-muted-foreground backdrop-blur-sm transition-colors focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/20"
                        placeholder={t('pages.faq.form.namePlaceholder')}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="mb-2 block text-sm font-medium text-foreground"
                      >
                        {t('pages.faq.form.emailLabel')}
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-xl border border-border/20 bg-background/50 px-4 py-3 text-foreground placeholder-muted-foreground backdrop-blur-sm transition-colors focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/20"
                        placeholder={t('pages.faq.form.emailPlaceholder')}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="message"
                      className="mb-2 block text-sm font-medium text-foreground"
                    >
                      {t('pages.faq.form.messageLabel')}
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="w-full resize-none rounded-xl border border-border/20 bg-background/50 px-4 py-3 text-foreground placeholder-muted-foreground backdrop-blur-sm transition-colors focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/20"
                      placeholder={t('pages.faq.form.messagePlaceholder')}
                    />
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-6 py-3 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t('buttons.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex transform items-center justify-center gap-2 rounded-2xl bg-gradient-electric px-8 py-4 font-semibold text-white transition-all duration-200 hover:scale-105 hover:opacity-90 focus:scale-105 focus:outline-none focus:ring-2 focus:ring-electric/20 disabled:scale-100 disabled:transform-none disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                          {t('pages.faq.form.sending')}
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          {t('pages.faq.form.sendMessage')}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {submitted && (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                    <svg
                      className="h-8 w-8 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">
                    {t('pages.faq.form.sentTitle')}
                  </h3>
                  <p className="mb-6 text-muted-foreground">{t('pages.faq.form.sentSubtitle')}</p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setShowForm(false);
                    }}
                    className="text-electric transition-colors hover:text-electric-glow"
                  >
                    {t('pages.faq.form.sendAnother')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
