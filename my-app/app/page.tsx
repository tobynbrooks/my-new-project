'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from 'react';
import AnimatedHeader from '@/components/ui/animatedheader';


const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    registration: ''
  });
  const [errors, setErrors] = useState({
    name: '',
    registration: ''
  });

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      name: '',
      registration: ''
    };

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }

    if (!formData.registration.trim()) {
      newErrors.registration = 'Registration number is required';
      isValid = false;
    } else if (!formData.registration.match(/^[A-Z0-9 ]+$/i)) {
      newErrors.registration = 'Invalid registration format';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Handle form submission
      console.log('Form submitted:', formData);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AnimatedHeader />
      <main className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Please enter your details to continue</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="registration">Car Registration</Label>
                <Input
                  id="registration"
                  placeholder="Enter car registration"
                  value={formData.registration}
                  onChange={(e) => setFormData({ ...formData, registration: e.target.value.toUpperCase() })}
                />
                {errors.registration && <p className="text-sm text-red-500">{errors.registration}</p>}
              </div>
            </CardContent>
            
            <CardFooter>
              <Button type="submit" className="w-full" onClick={() => window.location.href = '/tyre-size'}>
                Continue
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
      
    </div>
  );
};

export default RegistrationForm;



