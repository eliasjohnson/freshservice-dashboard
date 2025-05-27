import React from 'react';

interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Loading: React.FC<LoadingProps> = ({ 
  message = 'Loading data...', 
  size = 'md' 
}) => {
  const spinnerSize = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }[size];
  
  const textSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }[size];

  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <div className={`${spinnerSize} animate-spin rounded-full border-2 border-current border-t-transparent text-primary mb-4`}></div>
      <p className={`${textSize} font-medium text-foreground`}>{message}</p>
    </div>
  );
};

export const FullPageLoading: React.FC<LoadingProps> = (props) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <Loading {...props} size="lg" />
    </div>
  );
}; 