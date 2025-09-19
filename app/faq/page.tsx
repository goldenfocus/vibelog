"use client";

import emailjs from '@emailjs/browser';
import { ChevronDown, Mail, Send } from "lucide-react";
import React, { useState } from "react";

import { Navigation } from "@/components/Navigation";
import { useI18n } from "@/components/providers/I18nProvider";


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
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const faqData: FAQItem[] = [
    {
      question: "What is vibelog.io? ⚡",
      answer: "Hit record, speak your truth, we turn it into a polished post—headlines, sections, the works. ✨"
    },
    {
      question: "Which languages do you support?",
      answer: "50+ and counting. Create for the world, in your voice. 🌍"
    },
    {
      question: "How accurate is the transcription?",
      answer: "Creator-grade accurate, improves with context, and you can tweak anything fast."
    },
    {
      question: "Can I edit the post?",
      answer: "Absolutely—full control before you publish."
    },
    {
      question: "What's in the Free plan?",
      answer: "Unlimited recordings, core polish, 5-minute takes, watermark, and the community ride."
    },
    {
      question: "What do I get with Influencer ($12/mo)?",
      answer: "30-minute takes, no watermark, priority AI, social plugs, auto-publish, templates, analytics, email support."
    },
    {
      question: "What about Marketing Agency ($99/mo)?",
      answer: "Unlimited time, teams, brand theming, custom domain, advanced analytics, scheduling, API, priority phone, dedicated manager."
    },
    {
      question: "How long can I record?",
      answer: "Free 5 min • Influencer 30 min • Agency unlimited."
    },
    {
      question: "Where can I publish?",
      answer: "Blogs & sites, LinkedIn, Medium, WordPress, X, IG, TikTok, FB, YouTube Shorts, WhatsApp, Telegram, Slack, email… and more 📢"
    },
    {
      question: "Is my data safe?",
      answer: "Yes—encrypted, private, yours."
    },
    {
      question: "Does it work on mobile?",
      answer: "Yep. Looks great on phones. Native apps are brewing. 📱"
    },
    {
      question: "Team or custom needs?",
      answer: "Agency has you covered—or ping us for a custom fit."
    }
  ];

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
      [e.target.name]: e.target.value
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
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-electric bg-clip-text text-transparent">
              {t('pages.faq.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('pages.faq.subtitle')}
            </p>
          </div>

          {/* FAQ Accordion */}
          <div className="space-y-4 mb-16">
            {Array.isArray(faqData) && faqData.map((item, index) => {
              const isOpen = openItems.has(index);
              return (
                <div
                  key={index}
                  className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/20 overflow-hidden transition-all duration-200 hover:bg-card/70"
                >
                  <button
                    onClick={() => toggleItem(index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="w-full flex items-center justify-between p-6 text-left focus:outline-none focus:ring-2 focus:ring-electric/20 focus:bg-card/80 transition-colors"
                    aria-expanded={isOpen}
                    aria-controls={`faq-content-${index}`}
                  >
                    <h3 className="text-lg font-semibold text-foreground pr-4">
                      {item.question}
                    </h3>
                    <ChevronDown 
                      className={`w-5 h-5 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${
                        isOpen ? 'transform rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    id={`faq-content-${index}`}
                    className={`transition-all duration-200 ease-in-out ${
                      isOpen 
                        ? 'max-h-96 opacity-100' 
                        : 'max-h-0 opacity-0'
                    } overflow-hidden`}
                  >
                    <div className="px-6 pb-6">
                      <div className="pt-2 border-t border-border/10">
                        <p className="text-muted-foreground leading-relaxed mt-4">
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
          <div className="bg-gradient-to-br from-card/40 to-card/20 backdrop-blur-sm rounded-3xl p-8 sm:p-12 border border-border/20">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2 text-foreground">
                  {t('pages.faq.support.title')}
                </h2>
              </div>

              {!showForm && !submitted && (
                <div className="text-center">
                  <button 
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-electric hover:opacity-90 text-white font-semibold rounded-2xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-electric/20 focus:scale-105"
                  >
                    <Mail className="w-5 h-5" />
                    {t('pages.faq.support.button')}
                  </button>
                </div>
              )}

              {showForm && !submitted && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-border/20 bg-background/50 backdrop-blur-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-electric/20 focus:border-electric transition-colors"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-border/20 bg-background/50 backdrop-blur-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-electric/20 focus:border-electric transition-colors"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-border/20 bg-background/50 backdrop-blur-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-electric/20 focus:border-electric transition-colors resize-none"
                      placeholder="Hi VibeLog team, I have a question about..."
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-6 py-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-electric hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-2xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-electric/20 focus:scale-105 disabled:transform-none disabled:scale-100"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {submitted && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Message sent! ✨</h3>
                  <p className="text-muted-foreground mb-6">We'll get back to you soon.</p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setShowForm(false);
                    }}
                    className="text-electric hover:text-electric-glow transition-colors"
                  >
                    Send another message
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
