"use client";

import React from 'react';
import { X, Zap, Clock, Shield, Star, LogIn, CheckCircle } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

interface UpgradePromptProps {
  isVisible: boolean;
  onClose: () => void;
  message: string;
  benefits: string[];
  resetTime?: number; // When the limit resets
}

export default function UpgradePrompt({ 
  isVisible, 
  onClose, 
  message, 
  benefits,
  resetTime 
}: UpgradePromptProps) {
  const { signIn } = useAuth();

  if (!isVisible) return null;

  const formatTimeUntilReset = () => {
    if (!resetTime) return '';
    
    const now = Date.now();
    const diff = resetTime - now;
    
    if (diff <= 0) return '';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn('google');
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card/95 backdrop-blur-sm border border-electric/20 rounded-2xl p-6 shadow-2xl max-w-md w-full animate-[modalSlideIn_0.3s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-electric rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Upgrade to Premium</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-muted-foreground text-center leading-relaxed">
            {message}
          </p>
          {resetTime && (
            <div className="mt-3 p-3 bg-accent/50 rounded-lg flex items-center gap-2 justify-center">
              <Clock className="w-4 h-4 text-electric" />
              <span className="text-sm font-medium">
                Free quota resets in: {formatTimeUntilReset()}
              </span>
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-4 text-center">Premium Benefits</h4>
          <div className="space-y-3">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-muted-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-electric hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-electric/20"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
          
          <button
            onClick={onClose}
            className="w-full px-6 py-3 text-muted-foreground hover:text-foreground font-medium rounded-xl transition-colors"
          >
            Maybe later
          </button>
        </div>

        {/* Feature Highlight */}
        <div className="mt-6 pt-4 border-t border-border/20 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>Join thousands of creators already using premium features</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}