export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-6">
            Politique de Confidentialité
          </h1>
          
          <div className="mb-6 p-4 bg-gradient-to-br from-[#328fce]/10 to-[#84c19e]/10 border-2 border-[#328fce]/20 rounded-xl">
            <p className="text-gray-700 leading-relaxed">
              <strong>Notre engagement :</strong> Nous respectons votre vie privée. Les données collectées 
              sont uniquement utilisées pour améliorer votre expérience sur notre site. Aucune donnée 
              personnelle n'est vendue ou partagée avec des tiers.
            </p>
          </div>
          
          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                1. Quelles données collectons-nous ?
              </h2>
              <p className="leading-relaxed mb-3">
                Nous collectons uniquement des <strong>données d'utilisation anonymes</strong> lorsque vous naviguez 
                sur notre site, notamment :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>Les pages que vous visitez</li>
                <li>Le temps passé sur chaque page</li>
                <li>Les boutons sur lesquels vous cliquez</li>
                <li>Votre type de navigateur et système d'exploitation</li>
                <li>La résolution de votre écran</li>
                <li>Le pays d'origine de votre connexion (via votre adresse IP anonymisée)</li>
              </ul>
              <p className="leading-relaxed">
                <strong>Important :</strong> Nous n'identifions jamais personnellement nos visiteurs à travers 
                ces données. Nous ne collectons ni votre nom, ni votre adresse email, ni aucune autre information 
                personnelle identifiable, sauf si vous créez un compte utilisateur sur notre site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                2. Comment collectons-nous ces données ?
              </h2>
              <p className="leading-relaxed mb-3">
                Nous utilisons <strong>Posthog</strong>, un outil d'analyse open source et respectueux de 
                la vie privée. Posthog nous permet de :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>Comprendre comment les visiteurs utilisent notre site</li>
                <li>Identifier les problèmes techniques</li>
                <li>Améliorer l'expérience utilisateur</li>
                <li>Optimiser le contenu et la navigation</li>
              </ul>
              <div className="bg-blue-50 border-l-4 border-[#328fce] p-4 rounded">
                <p className="text-sm leading-relaxed">
                  <strong>💡 Pourquoi Posthog ?</strong> Contrairement à d'autres outils d'analyse, Posthog 
                  est une solution open source qui respecte votre vie privée. Le code est transparent et peut 
                  être audité par n'importe qui.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                3. Comment utilisons-nous ces données ?
              </h2>
              <p className="leading-relaxed mb-3">
                Les données collectées sont utilisées <strong>exclusivement</strong> pour :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li><strong>Analyser l'activité du site :</strong> Comprendre quelles pages sont les plus visitées</li>
                <li><strong>Améliorer l'expérience :</strong> Identifier les points de friction et les optimiser</li>
                <li><strong>Détecter les erreurs :</strong> Repérer les problèmes techniques rapidement</li>
                <li><strong>Prendre des décisions éclairées :</strong> Savoir quel contenu créer ou améliorer</li>
              </ul>
              <div className="bg-green-50 border-l-4 border-[#84c19e] p-4 rounded">
                <p className="text-sm leading-relaxed">
                  <strong>✅ Ce que nous ne faisons PAS :</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm">
                  <li>Vendre vos données à des tiers</li>
                  <li>Partager vos données avec des annonceurs</li>
                  <li>Utiliser vos données pour du marketing ciblé</li>
                  <li>Créer des profils utilisateurs détaillés</li>
                  <li>Tracker votre activité en dehors de notre site</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                4. Partage des données avec des tiers
              </h2>
              <p className="leading-relaxed text-lg font-semibold text-[#328fce] mb-3">
                Nous ne partageons AUCUNE donnée avec des tiers.
              </p>
              <p className="leading-relaxed">
                Les données d'analyse restent sur notre infrastructure Posthog et ne sont accessibles qu'à 
                notre équipe interne. Elles ne sont jamais vendues, louées ou partagées avec des entreprises 
                tierces, des annonceurs ou des partenaires commerciaux.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                5. Durée de conservation des données
              </h2>
              <p className="leading-relaxed">
                Les données d'analyse sont conservées pendant une période maximale de <strong>12 mois</strong>. 
                Passé ce délai, elles sont automatiquement supprimées de notre système. Cette durée nous permet 
                d'analyser les tendances annuelles tout en respectant le principe de minimisation des données.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                6. Les cookies
              </h2>
              <p className="leading-relaxed mb-3">
                Un cookie est un petit fichier texte stocké sur votre appareil qui nous permet de mémoriser 
                vos préférences. Nous utilisons les cookies uniquement pour :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li><strong>Cookie d'analyse Posthog :</strong> Pour suivre votre navigation de manière anonyme</li>
                <li><strong>Cookie de consentement :</strong> Pour mémoriser votre choix concernant les cookies</li>
                <li><strong>Cookies de session :</strong> Pour maintenir votre connexion si vous avez un compte</li>
              </ul>
              <p className="leading-relaxed">
                <strong>Vous avez le contrôle :</strong> Vous pouvez refuser les cookies d'analyse via notre 
                bannière de consentement. Vous pouvez également supprimer les cookies à tout moment via les 
                paramètres de votre navigateur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                7. Vos droits (RGPD)
              </h2>
              <p className="leading-relaxed mb-3">
                Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des 
                droits suivants :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li><strong>Droit d'accès :</strong> Vous pouvez demander à consulter les données que nous détenons sur vous</li>
                <li><strong>Droit de rectification :</strong> Vous pouvez corriger des données inexactes</li>
                <li><strong>Droit à l'effacement :</strong> Vous pouvez demander la suppression de vos données</li>
                <li><strong>Droit d'opposition :</strong> Vous pouvez vous opposer au traitement de vos données</li>
                <li><strong>Droit à la portabilité :</strong> Vous pouvez récupérer vos données dans un format utilisable</li>
              </ul>
              <p className="leading-relaxed">
                Pour exercer ces droits, contactez-nous via notre page de contact. Nous répondrons à votre 
                demande dans un délai maximal de 30 jours.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                8. Sécurité des données
              </h2>
              <p className="leading-relaxed">
                Nous prenons la sécurité de vos données très au sérieux. Nous mettons en œuvre des mesures 
                techniques et organisationnelles appropriées pour protéger vos données contre tout accès non 
                autorisé, modification, divulgation ou destruction, notamment :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>Chiffrement des connexions (HTTPS)</li>
                <li>Anonymisation des adresses IP</li>
                <li>Accès restreint aux données d'analyse</li>
                <li>Mises à jour régulières de sécurité</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                9. Comptes utilisateurs
              </h2>
              <p className="leading-relaxed">
                Si vous créez un compte sur notre site, nous collectons et stockons votre adresse email et 
                toute information que vous choisissez de nous fournir (photo de profil, etc.). Ces informations 
                sont stockées de manière sécurisée et ne sont jamais partagées avec des tiers. Vous pouvez 
                supprimer votre compte à tout moment via les paramètres de votre profil.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                10. Modifications de cette politique
              </h2>
              <p className="leading-relaxed">
                Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. 
                En cas de changements significatifs, nous vous en informerons par une notification sur le site. 
                Les modifications sont effectives dès leur publication sur cette page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                11. Contact
              </h2>
              <p className="leading-relaxed mb-3">
                Pour toute question concernant cette politique de confidentialité ou pour exercer vos droits, 
                vous pouvez nous contacter via notre page de contact.
              </p>
              <p className="leading-relaxed">
                Nous nous engageons à répondre à toutes vos questions et préoccupations dans les plus brefs délais.
              </p>
            </section>

            <section className="mt-8 pt-6 border-t-2 border-gray-200">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-sm text-gray-500">
                Cette politique est rédigée en français et est conforme au RGPD (Règlement Général sur la 
                Protection des Données) de l'Union Européenne.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

