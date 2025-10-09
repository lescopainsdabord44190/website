import { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';

export function ContactPage() {
  const { settings } = useSiteSettings();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-contact-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi du message');
      }

      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Error sending message:', error);
      setStatus('error');
      setErrorMessage('Une erreur est survenue lors de l\'envoi du message. Veuillez réessayer.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">Contactez-nous</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Une question ? Un renseignement ? N'hésitez pas à nous contacter, nous vous répondrons dans les plus
              brefs délais.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Envoyez-nous un message</h2>

              {status === 'success' && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                  Votre message a été envoyé avec succès ! Nous vous répondrons rapidement.
                </div>
              )}

              {status === 'error' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none transition-all"
                    placeholder="Votre nom"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none transition-all"
                    placeholder="votre@email.fr"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Sujet
                  </label>
                  <input
                    type="text"
                    id="subject"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none transition-all"
                    placeholder="Sujet de votre message"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Votre message..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-[#328fce] text-white px-6 py-3 rounded-full hover:bg-[#84c19e] transition-all hover:scale-105 font-medium shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                  {status === 'loading' ? 'Envoi en cours...' : 'Envoyer le message'}
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-[#328fce] to-[#84c19e] rounded-2xl shadow-lg p-8 text-white">
                <h2 className="text-2xl font-bold mb-6">Nos coordonnées</h2>
                <div className="space-y-4">
                  {settings.contact_phone && (
                    <a
                      href={`tel:${settings.contact_phone}`}
                      className="flex items-start gap-3 hover:opacity-80 transition-opacity"
                    >
                      <Phone className="w-6 h-6 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Téléphone</div>
                        <div className="text-white/90">{settings.contact_phone}</div>
                      </div>
                    </a>
                  )}

                  {settings.contact_email && (
                    <a
                      href={`mailto:${settings.contact_email}`}
                      className="flex items-start gap-3 hover:opacity-80 transition-opacity"
                    >
                      <Mail className="w-6 h-6 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Email</div>
                        <div className="text-white/90">{settings.contact_email}</div>
                      </div>
                    </a>
                  )}

                  <div className="flex items-start gap-3">
                    <MapPin className="w-6 h-6 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Adresse</div>
                      <div className="text-white/90">Gétigné, Loire-Atlantique</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Horaires d'ouverture</h3>
                <div className="space-y-2 text-gray-600">
                  <p className="flex justify-between">
                    <span className="font-medium">Lundi - Vendredi</span>
                    <span>7h30 - 18h30</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-medium">Vacances scolaires</span>
                    <span>Nous contacter</span>
                  </p>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden shadow-lg h-64">
                <img
                  src="/duo épaule.png"
                  alt="Mascotte"
                  className="absolute bottom-0 right-4 w-32 h-32 object-contain z-10"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#ffbf40] to-[#ff9fa8] opacity-50"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
