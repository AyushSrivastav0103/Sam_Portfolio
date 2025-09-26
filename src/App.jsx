import React, { useState, useEffect } from 'react';
import { ChevronDown, Star, Calendar, ArrowRight, Menu, X, Play, Github, Linkedin, Mail, ExternalLink } from 'lucide-react';

const Portfolio = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState('home');
  
  // Test: Simple return to debug white screen
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Portfolio Test</h1>
      <p>If you can see this, React is working!</p>
    </div>
  );
  
  // Removed voice recording UI for a cleaner data-focused hero

  // Smooth scroll animation
  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    setCurrentSection(sectionId);
    setIsMenuOpen(false);
  };

  // No voice interaction needed

  // Contact links (update with your real links)
  const contact = {
    email: 'shubham.banger@example.com',
    linkedin: 'https://www.linkedin.com/in/shubham-banger',
    github: 'https://github.com/shubhambanger',
  };

  const skills = [
    'Data Science', 'Machine Learning', 'Big Data Analytics', 'Data Engineering',
    'Data Management', 'Predictive Analytics', 'Customer Insights',
    'Retail & eCommerce Analytics', 'ETL & Data Pipelines', 'Python', 'SQL',
    'Forecasting', 'Reporting Automation', 'NLP'
  ];

  const tools = [
    { name: 'OpenAI', icon: '🤖' },
    { name: 'Claude', icon: '🧠' },
    { name: 'LangChain', icon: '⛓️' },
    { name: 'Pinecone', icon: '🌲' },
    { name: 'NotebookLM', icon: '📚' },
    { name: 'Make.com', icon: '⚡' },
    { name: 'Zapier', icon: '🔗' }
  ];

  const experiences = [
    { role: 'Senior Data Operations Manager', company: 'Samsara', period: 'Jul 2025 - Present' },
    { role: 'Manager, Performance Analytics and Data Science', company: 'Walmart Canada', period: 'Jan 2023 - Jul 2025' },
    { role: 'Senior Data Analyst', company: 'Walmart Canada', period: 'Jun 2021 - Dec 2022' },
    { role: 'Analyst, National Continuous Improvement', company: 'Walmart Canada', period: 'Mar 2020 - Jun 2021' },
    { role: 'Information Technology System, Data Lead', company: 'Fastfrate', period: 'Jul 2018 - Feb 2020' },
    { role: 'Business Intelligence', company: 'TFI International Inc.', period: 'Aug 2016 - Jul 2018' }
  ];

  const testimonials = [
    {
      text: "Delivered measurable impact on inventory accuracy and reduced stockouts quarter over quarter.",
      author: "Director, Merchandising Analytics",
      role: "Walmart Canada",
      rating: 5
    },
    {
      text: "Automated reporting cut manual effort significantly and improved decision speed across teams.",
      author: "Senior Manager, Ops Analytics",
      role: "Logistics Enterprise",
      rating: 5
    },
    {
      text: "Clear communication, strong technical leadership, and a sharp eye for business value.",
      author: "VP, Data & Insights",
      role: "SaaS Retail Platform",
      rating: 5
    }
  ];

  const projects = [
    {
      title: "ForecastIQ — Demand Forecasting for Retail",
      description: "Built a demand forecasting platform leveraging gradient-boosted models and LSTM variants to improve store/SKU forecasting accuracy and reduce stockouts.",
      features: [
        "+18% MAPE improvement vs baseline",
        "Automated feature store and retraining",
        "What-if simulation for promotions/seasonality"
      ],
      status: "Driving better inventory and revenue outcomes",
      gradient: "from-teal-500 to-blue-600"
    }
  ];

  const blogPosts = [
    {
      title: "Decoding LLM Performance: A Guide to Evaluating LLM Applications",
      date: "Dec 30, 2023",
      image: "🔍"
    },
    {
      title: "Harnessing Retrieval Augmented Generation With Langchain",
      date: "Aug 2, 2023",
      image: "🧠"
    },
    {
      title: "Exploring the Creativity of ChatGPT: A Step-by-Step Guide to Using the API",
      date: "Mar 28, 2023",
      image: "✨"
    }
  ];

  // Contact form state
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' });
  const [formStatus, setFormStatus] = useState({ state: 'idle', error: '' });

  const submitContact = async (e) => {
    e.preventDefault();
    setFormStatus({ state: 'loading', error: '' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send');
      }
      setForm({ name: '', email: '', message: '' });
      setFormStatus({ state: 'success', error: '' });
    } catch (err) {
      setFormStatus({ state: 'error', error: err.message || 'Something went wrong' });
    }
  };

  const logResume = async () => {
    try { await fetch('/api/resume'); } catch {}
  };

  // Booking state and helpers
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11
  const [selectedDay, setSelectedDay] = useState(null); // 1..n or null
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookingForm, setBookingForm] = useState({ name: '', email: '' });
  const [bookingStatus, setBookingStatus] = useState({ state: 'idle', msg: '' });

  const formatDate = (y, m0, d) => {
    const mm = String(m0 + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const daysInMonth = (y, m0) => new Date(y, m0 + 1, 0).getDate();

  const fetchAvailability = async (y, m0, d) => {
    if (!d) return;
    const dateStr = formatDate(y, m0, d);
    try {
      const res = await fetch(`/api/availability?date=${dateStr}`);
      if (!res.ok) throw new Error('Failed to load availability');
      const data = await res.json();
      setAvailableSlots(data.available || []);
    } catch (e) {
      setAvailableSlots([]);
    }
  };

  const bookSlot = async (time) => {
    if (!selectedDay) return;
    if (!bookingForm.email) {
      setBookingStatus({ state: 'error', msg: 'Email is required' });
      return;
    }
    setBookingStatus({ state: 'loading', msg: '' });
    const dateStr = formatDate(currentYear, currentMonth, selectedDay);
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: bookingForm.name, email: bookingForm.email, date: dateStr, time })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) throw new Error('This slot was just booked. Pick another.');
        throw new Error(data.error || 'Booking failed');
      }
      setBookingStatus({ state: 'success', msg: 'Booked! Check your email for confirmation.' });
      // Refresh availability to remove the booked slot
      fetchAvailability(currentYear, currentMonth, selectedDay);
    } catch (e) {
      setBookingStatus({ state: 'error', msg: e.message || 'Booking failed' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Shubham Banger
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {['Home', 'About', 'Work', 'Experience', 'Process', 'FAQ', 'Contact'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase())}
                  className="text-gray-700 hover:text-purple-600 transition-colors duration-200"
                >
                  {item}
                </button>
              ))}
              <button className="bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600 transition-colors duration-200">
                Start Project
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

          {/* Mobile Menu */}
            {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-purple-100">
              {['Home', 'About', 'Work', 'Experience', 'Process', 'FAQ', 'Contact'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase())}
                  className="block w-full text-left py-2 text-gray-700 hover:text-purple-600"
                >
                  {item}
                </button>
              ))}
              <button className="w-full mt-2 bg-blue-500 text-white py-2 rounded-full">
                Start Project
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full mb-8 animate-pulse">
            ⭐ Data Science Manager
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent leading-tight">
            Turning complex data into<br />actionable business decisions
          </h1>

          {/* Data-focused decorative avatar */}
          <div className="relative mx-auto w-32 h-32 mb-12 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-lg">
            <span className="text-4xl">📈</span>
            <div className="absolute -inset-1 rounded-full bg-white/20 blur-md"></div>
          </div>

          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Data-driven leader with deep expertise in analytics, retail, eCommerce, and customer insights.
            I build predictive solutions and scalable data products that improve operations, grow revenue,
            and elevate customer experience.
          </p>

          <div className="flex items-center justify-center gap-4 mb-10">
            <button
              onClick={() => scrollToSection('contact')}
              className="bg-teal-600 text-white px-6 py-3 rounded-full hover:bg-teal-700 transition-colors"
            >
              Contact
            </button>
            <a
              href="/Shubham_Banger_Resume.pdf"
              onClick={logResume}
              className="px-6 py-3 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              View Resume
            </a>
          </div>

          <ChevronDown className="mx-auto text-gray-400 animate-bounce cursor-pointer hover:text-purple-600"
                       onClick={() => scrollToSection('tools')} />
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 px-6 bg-white/40">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">About</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            As a data-driven decision-maker, I connect the dots across data to craft strategic
            solutions that enhance operations, boost revenue, and improve customer satisfaction.
            With a strong foundation in machine learning and predictive analytics, I turn complex
            datasets into actionable insights that drive growth and optimize performance.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Extensive experience in analytics, retail, eCommerce, and customer insights</li>
            <li>Expertise in predictive modeling, forecasting, and advanced analytics</li>
            <li>Skilled at automating reporting and building scalable ML pipelines</li>
            <li>Focused on customer behavior, lifecycle strategy, and CX optimization</li>
          </ul>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="py-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-500 mb-8">Tools I use on a daily basis</p>
          
          {/* Flowing yellow border container */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 rounded-full opacity-60 animate-pulse"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-full p-8 m-2">
              <div className="flex flex-wrap justify-center items-center gap-8">
                {tools.map((tool, index) => (
                  <div key={index} className="flex flex-col items-center group">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-200">
                      <span className="text-2xl">{tool.icon}</span>
                    </div>
                    <span className="text-sm mt-2 text-gray-600">{tool.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="work" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">Explore My Projects</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              My work is a blend of innovative thinking and practical solutions, embodying creativity and pragmatism.
            </p>
          </div>

          {/* Project Cards Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Project 1 - ForecastIQ */}
            <div className="group relative bg-gradient-to-br from-teal-500 to-blue-600 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className="p-8">
                <div className="w-20 h-20 bg-white/20 rounded-full mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">ForecastIQ</h3>
                <p className="text-white/90 mb-6">Demand Forecasting Platform with ML-powered predictions reducing stockouts by 18%</p>
                <div className="flex items-center text-white/80">
                  <span className="text-sm">View Project</span>
                  <ArrowRight className="ml-2" size={16} />
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full"></div>
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/5 rounded-full"></div>
            </div>

            {/* Project 2 - Customer360 */}
            <div className="group relative bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className="p-8">
                <div className="w-20 h-20 bg-white/20 rounded-full mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-3xl">👥</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Customer360</h3>
                <p className="text-white/90 mb-6">Unified customer data platform with real-time analytics and lifecycle insights</p>
                <div className="flex items-center text-white/80">
                  <span className="text-sm">View Project</span>
                  <ArrowRight className="ml-2" size={16} />
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full"></div>
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/5 rounded-full"></div>
            </div>

            {/* Project 3 - AutoReport */}
            <div className="group relative bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className="p-8">
                <div className="w-20 h-20 bg-white/20 rounded-full mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-3xl">🤖</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">AutoReport</h3>
                <p className="text-white/90 mb-6">Automated reporting system saving 30+ hours weekly with intelligent insights</p>
                <div className="flex items-center text-white/80">
                  <span className="text-sm">View Project</span>
                  <ArrowRight className="ml-2" size={16} />
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full"></div>
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/5 rounded-full"></div>
            </div>

            {/* Project 4 - SupplyChainAI */}
            <div className="group relative bg-gradient-to-br from-green-500 to-teal-600 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className="p-8">
                <div className="w-20 h-20 bg-white/20 rounded-full mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-3xl">🚚</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">SupplyChainAI</h3>
                <p className="text-white/90 mb-6">End-to-end supply chain optimization with predictive analytics and routing</p>
                <div className="flex items-center text-white/80">
                  <span className="text-sm">View Project</span>
                  <ArrowRight className="ml-2" size={16} />
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full"></div>
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/5 rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-4">Trusted by Professionals</h2>
          <p className="text-center text-gray-600 mb-16">
            While most of my client reviews are NDA-protected, I managed to sneak in a few favorites from my previous partners.
          </p>

          {/* Flowing yellow border */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 rounded-3xl opacity-60 animate-pulse"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl p-2 m-2">
              <div className="grid md:grid-cols-3 gap-8 p-8">
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="bg-white/70 rounded-2xl p-6">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="text-yellow-400 fill-current" size={20} />
                      ))}
                    </div>
                    <p className="text-gray-700 mb-6 leading-relaxed">{testimonial.text}</p>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center mr-3">
                        <span className="text-purple-600 font-bold">
                          {testimonial.author.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{testimonial.author}</p>
                        <p className="text-sm text-gray-500">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">Process</h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              My structured approach to building exceptional AI solutions. From exploration to execution, 
              this framework brings AI vision to life — strategic, focused, and built for real-world success.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-blue-800 mb-4">Discover</h3>
                <p className="text-gray-700 leading-relaxed">
                  Uncover the real opportunity through deep discovery — identifying pain points, inefficiencies, 
                  and untapped leverage where AI can create the most impact and value for your business.
                </p>
              </div>
              <div className="absolute -bottom-10 -right-10 text-8xl font-bold text-blue-100">01</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-purple-800 mb-4">Design</h3>
                <p className="text-gray-700 leading-relaxed">
                  Architect intelligent systems with intention — defining agent workflows, selecting optimal tools, 
                  and mapping a scalable architecture tailored for impact, autonomy, and utility.
                </p>
              </div>
              <div className="absolute -bottom-10 -right-10 text-8xl font-bold text-purple-100">02</div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section className="py-20 px-6 bg-white/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12">Skills</h2>
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8">
            <div className="flex flex-wrap gap-4">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 px-4 py-2 rounded-xl hover:bg-blue-200 transition-colors duration-200 cursor-default"
                >
                  {skill}
                </span>
              ))}
              <span className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl">+ More</span>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section id="experience" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-12">Experience</h2>
          <div className="space-y-8">
            {experiences.map((exp, index) => (
              <div key={index} className="flex justify-between items-center border-b border-gray-200 pb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{exp.role}</h3>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-800">{exp.company}</p>
                  <p className="text-gray-500">{exp.period}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Education Section */}
      <section className="py-20 px-6 bg-white/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-12">Education</h2>
          <div className="flex justify-between items-center border-b border-gray-200 pb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">University of Toronto</h3>
              <p className="text-gray-600">Data Science</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500">2019 - 2020</p>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="py-20 px-6 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12">Blog</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {blogPosts.map((post, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200">
                <div className="h-48 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                  <span className="text-6xl">{post.image}</span>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-500 mb-2">{post.date}</p>
                  <h3 className="text-lg font-semibold text-gray-800 leading-tight">{post.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-16">
            Relied upon by a Fresh Generation of Companies
          </h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-6xl font-bold text-purple-600 mb-4">87%</div>
              <p className="text-gray-600">Reduction in human agent handoffs</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl p-8 text-white">
              <div className="h-32 mb-4 bg-white/10 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">🤖</span>
              </div>
              <p className="text-sm opacity-90">"AI is going to be the new Customer Interface"</p>
              <div className="flex items-center mt-4">
                <div className="w-8 h-8 bg-white/20 rounded-full mr-2"></div>
                <div>
                  <p className="text-xs font-medium">Mike Fehringer</p>
                  <p className="text-xs opacity-75">Senior Manager, RingCentral</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-100 rounded-3xl p-8 text-center">
              <div className="text-4xl mb-4">🚀</div>
              <p className="text-blue-800 font-medium">Embrace the power of Artificial Intelligence and witness seamless growth like never before.</p>
            </div>
            
            <div className="text-center">
              <div className="text-6xl font-bold text-purple-600 mb-4">7x</div>
              <p className="text-gray-600">Faster Software Development</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-6 bg-white/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Common Queries Answered</h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6">
              <div className="flex justify-between items-center cursor-pointer">
                <h3 className="text-lg font-semibold">How do you approach building AI solutions?</h3>
                <ChevronDown />
              </div>
              <div className="mt-4 text-gray-600 leading-relaxed">
                Every project begins with deep discovery — understanding the real-world problem, data landscape, and desired 
                business impact. From there, I design and validate the right architecture (agentic or otherwise), select tools 
                aligned with your goals, and rapidly prototype for early feedback. I prioritize clarity, autonomy, and measurable 
                utility at each stage.
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6">
              <div className="flex justify-between items-center cursor-pointer">
                <h3 className="text-lg font-semibold">What tools and frameworks do you use for AI engineering?</h3>
                <ChevronDown />
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6">
              <div className="flex justify-between items-center cursor-pointer">
                <h3 className="text-lg font-semibold">How do you measure the success of your AI solutions?</h3>
                <ChevronDown />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl font-bold mb-8">
              Schedule a free<br />Discovery call 📞
            </h2>
            <p className="text-xl text-gray-600 mb-4">
              Looking to start a project or just need some AI advice?
            </p>
            <p className="text-xl text-gray-600">
              Let's chat!
            </p>
          </div>
          
          <div className="bg-gray-900 rounded-3xl p-8 text-white">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mr-4">
                <Calendar className="text-white" />
              </div>
              <div>
                <h3 className="font-bold">Discovery Call</h3>
                <p className="text-gray-300">20m • Google Meet • Asia/Kolkata</p>
              </div>
            </div>
            
          <div className="bg-gray-800 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold">
                {new Date(currentYear, currentMonth, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
              </h4>
              <div className="flex space-x-2">
                <button
                  className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center"
                  onClick={() => {
                    const prev = new Date(currentYear, currentMonth - 1, 1);
                    setCurrentYear(prev.getFullYear());
                    setCurrentMonth(prev.getMonth());
                    setSelectedDay(null);
                    setAvailableSlots([]);
                    setBookingStatus({ state: 'idle', msg: '' });
                  }}
                >
                  &lt;
                </button>
                <button
                  className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center"
                  onClick={() => {
                    const next = new Date(currentYear, currentMonth + 1, 1);
                    setCurrentYear(next.getFullYear());
                    setCurrentMonth(next.getMonth());
                    setSelectedDay(null);
                    setAvailableSlots([]);
                    setBookingStatus({ state: 'idle', msg: '' });
                  }}
                >
                  &gt;
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-sm">
              {['S','M','T','W','T','F','S'].map((d) => (
                <div key={d} className="text-gray-400 text-center">{d}</div>
              ))}

              {Array.from({ length: daysInMonth(currentYear, currentMonth) }, (_, i) => i + 1).map((day) => (
                <button
                  key={day}
                  onClick={() => {
                    setSelectedDay(day);
                    setBookingStatus({ state: 'idle', msg: '' });
                    fetchAvailability(currentYear, currentMonth, day);
                  }}
                  className={`h-8 rounded text-center hover:bg-gray-700 ${
                    selectedDay === day ? 'bg-white text-black' : ''
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Slot picker */}
            {selectedDay && (
              <div className="mt-4">
                <div className="text-sm text-gray-300 mb-2">Available slots</div>
                <div className="flex flex-wrap gap-2">
                  {availableSlots.length === 0 && (
                    <div className="text-gray-400 text-sm">No slots available for this day.</div>
                  )}
                  {availableSlots.map((t) => (
                    <button
                      key={t}
                      onClick={() => bookSlot(t)}
                      className="px-3 py-1 rounded-full bg-white text-gray-900 hover:bg-gray-100"
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Booking form */}
                <div className="mt-4 grid md:grid-cols-2 gap-3">
                  <input
                    placeholder="Your name (optional)"
                    value={bookingForm.name}
                    onChange={(e)=>setBookingForm(f=>({...f,name:e.target.value}))}
                    className="w-full border border-gray-700 bg-gray-900 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    placeholder="Your email *"
                    type="email"
                    value={bookingForm.email}
                    onChange={(e)=>setBookingForm(f=>({...f,email:e.target.value}))}
                    className="w-full border border-gray-700 bg-gray-900 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {bookingStatus.state==='error' && (
                  <div className="mt-2 text-sm text-red-400">{bookingStatus.msg}</div>
                )}
                {bookingStatus.state==='success' && (
                  <div className="mt-2 text-sm text-green-400">{bookingStatus.msg}</div>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-12 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-4xl font-bold mb-6">
                Ready to transform your<br />business with AI?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Let's bring your vision to life!
              </p>
              <button className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors duration-200">
                Start a Project
              </button>
            </div>
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-white/10 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-6 bg-white/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Contact</h2>
          <p className="text-gray-600 mb-8">Open to opportunities, collaborations, and conversations.</p>
          <form onSubmit={submitContact} className="max-w-xl mx-auto text-left bg-white rounded-2xl shadow p-6">
            <div className="grid gap-4">
              {/* Honeypot field */}
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e)=>setForm(f=>({...f,website:e.target.value}))} className="hidden" placeholder="Your website" />
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email *</label>
                <input type="email" required value={form.email} onChange={(e)=>setForm(f=>({...f,email:e.target.value}))} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Message *</label>
                <textarea required rows={4} value={form.message} onChange={(e)=>setForm(f=>({...f,message:e.target.value}))} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="How can I help?" />
              </div>
              <button disabled={formStatus.state==='loading'} className="bg-teal-600 text-white px-6 py-3 rounded-full hover:bg-teal-700 transition disabled:opacity-60">
                {formStatus.state==='loading' ? 'Sending…' : 'Send Message'}
              </button>
              {formStatus.state==='success' && <div className="text-green-700 text-sm">Thanks! I’ll get back to you soon.</div>}
              {formStatus.state==='error' && <div className="text-red-600 text-sm">{formStatus.error}</div>}
            </div>
          </form>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
            <a href={`mailto:${contact.email}`} className="inline-flex items-center justify-center gap-2 text-teal-700 hover:text-teal-800">
              <Mail size={18} /> Email Directly
            </a>
            <a href={contact.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 text-blue-700 hover:text-blue-800">
              <Linkedin size={18} /> LinkedIn
            </a>
            <a href={contact.github} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 text-gray-800 hover:text-black">
              <Github size={18} /> GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-top border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-gray-600">© {new Date().getFullYear()} Shubham Banger</div>
            <div className="flex items-center gap-6">
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-gray-700 hover:text-teal-700"><Mail size={18} /> Email</a>
              <a href={contact.github} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-gray-900"><Github size={18} /> GitHub</a>
              <a href={contact.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-blue-700"><Linkedin size={18} /> LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Portfolio;