import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useSupabaseStatus } from '../contexts/SupabaseStatusContext';

type GameState = 'idle' | 'ready' | 'countdown' | 'playing' | 'gameover';

interface MaintenanceGameProps {
  onBack?: () => void;
}

interface GameObject {
  x: number;
  y: number;
  type: 'bomb' | 'fruit' | 'heart' | 'gun' | 'airBomb' | 'jetpack' | 'slowdown';
  width: number;
  height: number;
  speed: number; // Vitesse individuelle de l'objet
  oscillationOffset?: number; // Pour l'oscillation des cœurs et pistolets
  oscillationTime?: number; // Temps pour l'animation d'oscillation
  velY?: number; // Vélocité verticale pour les bombes aériennes
  velX?: number; // Vélocité horizontale pour les bombes aériennes (quand elles tombent de côté)
}

interface Bullet {
  x: number;
  y: number;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export function MaintenanceGame({ onBack }: MaintenanceGameProps) {
  const { isOnline } = useSupabaseStatus();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gameStateRef = useRef<GameState>('idle');
  const keysPressedRef = useRef<Set<string>>(new Set());
  const [gameState, setGameState] = useState<GameState>('idle');
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [jetpackFuel, setJetpackFuel] = useState(0);
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isTop10, setIsTop10] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Array<{ id: string; player_name: string; score: number; created_at: string }>>([]);
  const [scoreSaved, setScoreSaved] = useState(false);

  // Variables du jeu
  const gameDataRef = useRef({
    playerX: 0,
    playerY: 0,
    playerVelY: 0,
    isJumping: false,
    hasDoubleJumped: false, // Pour savoir si on a déjà fait le double saut
    isSpacePressed: false, // Pour détecter si la barre espace est maintenue
    jumpChargeTime: 0, // Temps pendant lequel la barre espace est maintenue
    maxJumpCharge: 0.3, // Temps maximum de charge (0.3 secondes)
    isDownPressed: false, // Pour détecter si la flèche du bas est pressée
    objects: [] as GameObject[],
    objectSpawnTimer: 0,
    groundY: 0,
    currentLives: 3,
    currentScore: 0,
    fruitsCollected: 0, // Compteur de fruits collectés pour la vitesse progressive
    baseSpeed: 150, // Vitesse de base (augmentée)
    speedMultiplier: 1, // Multiplicateur de vitesse qui augmente
    airBombTimer: 0, // Timer pour les bombes aériennes
    groundExplosions: [] as Array<{ x: number; y: number; radius: number; life: number; maxLife: number }>, // Explosions au sol
    mascotteImage: null as HTMLImageElement | null,
    explosionParticles: [] as Particle[], // Particules pour l'explosion
    gunCount: 0, // Nombre de pistolets (0, 1, 2, ou 3)
    bullets: [] as Bullet[], // Projectiles tirés
    lastShotTime: 0, // Temps du dernier tir (pour limiter le taux de tir)
    hasJetpack: false, // Indique si le joueur a un jetpack
    isJetpackActive: false, // Indique si le jetpack est actuellement activé (touche maintenue)
    lastJetpackSoundTime: 0, // Temps du dernier son de jetpack
    jetpackFuel: 0, // Carburant du jetpack (0-100)
  });

  // Fonction pour mettre à jour l'état de manière synchrone
  const updateGameState = useCallback((newState: GameState) => {
    gameStateRef.current = newState;
    setGameState(newState);
  }, []);

  // Fonction pour charger le classement
  const loadLeaderboard = useCallback(async (limit: number = 10) => {
    if (!isOnline) return [];
    
    try {
      const { data, error } = await supabase
        .from('game_scores')
        .select('id, player_name, score, created_at')
        .order('score', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Erreur lors du chargement du classement:', error);
        return [];
      }
      
      if (data) {
        if (limit === 10) {
          setLeaderboard(data);
        }
        return data;
      }
      return [];
    } catch (error) {
      console.error('Erreur lors du chargement du classement:', error);
      return [];
    }
  }, [isOnline]);

  // Fonction pour vérifier si le score est dans le top 10
  const checkIfTop10 = useCallback(async (finalScore: number) => {
    if (!isOnline) return false;
    
    try {
      const { data, error } = await supabase
        .from('game_scores')
        .select('score')
        .order('score', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Erreur lors de la vérification du top 10:', error);
        return false;
      }
      
      // Si on a moins de 10 scores, on est automatiquement dans le top 10
      if (!data || data.length < 10) {
        return true;
      }
      
      // Vérifier si notre score est supérieur au 10ème meilleur score
      const tenthScore = data[9]?.score || 0;
      return finalScore > tenthScore;
    } catch (error) {
      console.error('Erreur lors de la vérification du top 10:', error);
      return false;
    }
  }, [isOnline]);

  // Fonction pour sauvegarder le score
  const saveScore = useCallback(async (name: string, finalScore: number) => {
    if (!isOnline) return;
    
    try {
      const { error } = await supabase
        .from('game_scores')
        .insert({
          player_name: name.toUpperCase().substring(0, 3),
          score: finalScore,
        });
      
      if (error) {
        console.error('Erreur lors de la sauvegarde du score:', error);
        return false;
      }
      
      setScoreSaved(true);
      await loadLeaderboard();
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du score:', error);
      return false;
    }
  }, [isOnline, loadLeaderboard]);

  // Fonction pour créer un son simple avec Web Audio API
  const playSound = useCallback((type: 'bomb' | 'fruit') => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (type === 'bomb') {
        // Son "ouch" - un son grave et court
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } else if (type === 'fruit') {
        // Son de collecte - un son aigu et joyeux
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
      }
    } catch (error) {
      // Ignorer les erreurs audio (peut ne pas fonctionner dans certains navigateurs)
      console.log('Audio not available');
    }
  }, []);

  // Fonction pour créer une explosion de particules
  const createExplosion = useCallback((x: number, y: number) => {
    const particles: Particle[] = [];
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = Math.random() * 200 + 100;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        size: Math.random() * 8 + 4,
        color: `hsl(${Math.random() * 60 + 0}, 100%, 50%)`, // Couleurs orange/rouge
      });
    }
    
    gameDataRef.current.explosionParticles = particles;
  }, []);

  // Fonction pour créer des particules de propulsion du jetpack
  const createJetpackThrust = useCallback((x: number, y: number) => {
    const particles: Particle[] = [];
    const particleCount = 10;
    
    for (let i = 0; i < particleCount; i++) {
      // Angle orienté vers le bas avec variation
      const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.6; // Vers le bas avec variation de ±30°
      const speed = Math.random() * 150 + 100;
      particles.push({
        x: x + (Math.random() - 0.5) * 20, // Légère variation horizontale
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3,
        maxLife: 0.3,
        size: Math.random() * 6 + 4,
        color: `hsl(${Math.random() * 40 + 10}, 100%, ${50 + Math.random() * 20}%)`, // Couleurs orange/rouge/jaune
      });
    }
    
    // Ajouter aux particules existantes au lieu de les remplacer
    gameDataRef.current.explosionParticles.push(...particles);
  }, []);

  // Charger l'image de la mascotte
  useEffect(() => {
    const img = new Image();
    img.src = '/illustrations/mascottes/demis mascotte2.png';
    img.onload = () => {
      gameDataRef.current.mascotteImage = img;
    };
  }, []);

  // Charger le top 3 au montage et pendant le jeu
  const [top3, setTop3] = useState<Array<{ id: string; player_name: string; score: number; created_at: string }>>([]);
  
  useEffect(() => {
    if (isOnline && (gameState === 'idle' || gameState === 'playing')) {
      loadLeaderboard(3).then((data) => {
        if (data) {
          setTop3(data);
        }
      });
    }
  }, [isOnline, gameState, loadLeaderboard]);

  // Charger le classement complet quand le jeu se termine
  useEffect(() => {
    if (gameState === 'gameover' && isOnline) {
      loadLeaderboard(10);
    }
  }, [gameState, isOnline, loadLeaderboard]);

  // Fonction pour créer un objet
  const spawnObject = useCallback((canvas: HTMLCanvasElement) => {
    const rand = Math.random();
    let type: 'bomb' | 'fruit' | 'heart' | 'gun' | 'jetpack' | 'slowdown';
    
    // 8% de chance d'être un pistolet, 6% de chance d'être un jetpack, 2% de chance d'être un slowdown, 3% de chance d'être un cœur, 23% de chance d'être une bombe, 58% de chance d'être un fruit
    if (rand < 0.08) {
      type = 'gun';
    } else if (rand < 0.14) {
      type = 'jetpack';
    } else if (rand < 0.16) {
      type = 'slowdown';
    } else if (rand < 0.19) {
      type = 'heart';
    } else if (rand < 0.42) {
      type = 'bomb';
    } else {
      type = 'fruit';
    }
    
    // Créer des "lanes" (voies) à différentes hauteurs pour plus de variété
    const lanes = 4; // 4 voies différentes
    const laneHeight = 150 / lanes; // Espace entre chaque voie
    const laneIndex = Math.floor(Math.random() * lanes);
    const baseY = gameDataRef.current.groundY - 50 - (laneIndex * laneHeight + laneHeight / 2);
    
    // Vitesse de base avec variation aléatoire, multipliée par le multiplicateur
    // Les cœurs, pistolets, jetpacks et slowdown vont plus lentement (50% de la vitesse normale)
    const speedVariation = Math.random() * 30 - 15; // Variation réduite de -15 à +15
    const baseSpeed = (type === 'heart' || type === 'gun' || type === 'jetpack' || type === 'slowdown')
      ? gameDataRef.current.baseSpeed * 0.5  // 50% plus lent pour les cœurs, pistolets, jetpacks et slowdown
      : gameDataRef.current.baseSpeed;
    const speed = (baseSpeed + speedVariation) * gameDataRef.current.speedMultiplier;
    
    gameDataRef.current.objects.push({
      x: canvas.width + 50,
      y: baseY,
      type,
      width: 40,
      height: 40,
      speed, // Vitesse individuelle avec multiplicateur
      oscillationOffset: (type === 'heart' || type === 'gun') ? 0 : undefined, // Pour l'oscillation
      oscillationTime: (type === 'heart' || type === 'gun') ? 0 : undefined, // Temps pour l'animation
    });
  }, []);

  // Fonction de rendu
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { playerX, playerY, objects, mascotteImage } = gameDataRef.current;
    const state = gameStateRef.current;

    // Effacer le canvas
    ctx.fillStyle = '#FEF5F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state === 'idle' || state === 'ready' || state === 'countdown' || state === 'playing') {
      // Dessiner le sol
      ctx.fillStyle = '#84c19e';
      ctx.fillRect(0, gameDataRef.current.groundY, canvas.width, canvas.height - gameDataRef.current.groundY);

      // Dessiner la mascotte
      if (mascotteImage) {
        ctx.drawImage(mascotteImage, playerX - 40, playerY - 40, 80, 80);
      } else {
        // Fallback si l'image n'est pas chargée
        ctx.fillStyle = '#328fce';
        ctx.beginPath();
        ctx.arc(playerX, playerY, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('😊', playerX, playerY);
      }

      // Dessiner les objets (seulement en mode playing)
      if (state === 'playing') {
        objects.forEach(obj => {
          const objY = obj.y + (obj.oscillationOffset || 0); // Position Y avec oscillation
          
          if (obj.type === 'bomb') {
            // Dessiner la bombe (emoji caca)
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💩', obj.x + 20, objY + 20);
          } else if (obj.type === 'airBomb') {
            // Dessiner la bombe aérienne (emoji caca avec effet de lueur)
            // Ajouter un effet de lueur
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 10;
            ctx.font = '45px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💩', obj.x + 20, obj.y + 20);
            ctx.shadowBlur = 0;
          } else if (obj.type === 'heart') {
            // Dessiner la bulle
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(obj.x + 20, objY + 20, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#328fce';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Dessiner le cœur
            ctx.fillStyle = '#ff6243';
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('❤️', obj.x + 20, objY + 20);
          } else if (obj.type === 'jetpack') {
            // Dessiner la bulle pour le jetpack
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(obj.x + 20, objY + 20, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#328fce';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Dessiner un jetpack avec Canvas
            ctx.save();
            ctx.translate(obj.x + 20, objY + 20);
            
            // Corps du jetpack (rectangle arrondi)
            ctx.fillStyle = '#4a5568';
            ctx.beginPath();
            ctx.roundRect(-15, -10, 30, 20, 5);
            ctx.fill();
            
            // Réservoirs de carburant (cylindres)
            ctx.fillStyle = '#2d3748';
            ctx.beginPath();
            ctx.arc(-8, 0, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(8, 0, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Flammes (effet de propulsion)
            ctx.fillStyle = '#ff6243';
            ctx.beginPath();
            ctx.moveTo(-5, 10);
            ctx.lineTo(0, 15);
            ctx.lineTo(5, 10);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#ffa500';
            ctx.beginPath();
            ctx.moveTo(-3, 10);
            ctx.lineTo(0, 13);
            ctx.lineTo(3, 10);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
          } else if (obj.type === 'slowdown') {
            // Dessiner la bulle pour le bonus slowdown
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(obj.x + 20, objY + 20, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#84c19e';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Dessiner une icône de ralentissement (flèche vers le bas avec ligne)
            ctx.save();
            ctx.translate(obj.x + 20, objY + 20);
            ctx.strokeStyle = '#84c19e';
            ctx.fillStyle = '#84c19e';
            ctx.lineWidth = 3;
            
            // Flèche vers le bas
            ctx.beginPath();
            ctx.moveTo(0, -8);
            ctx.lineTo(-5, -3);
            ctx.lineTo(5, -3);
            ctx.closePath();
            ctx.fill();
            
            // Ligne horizontale
            ctx.beginPath();
            ctx.moveTo(-8, 0);
            ctx.lineTo(8, 0);
            ctx.stroke();
            
            // Ligne horizontale en bas
            ctx.beginPath();
            ctx.moveTo(-8, 5);
            ctx.lineTo(8, 5);
            ctx.stroke();
            
            ctx.restore();
          } else if (obj.type === 'gun') {
            // Dessiner la bulle pour le pistolet
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(obj.x + 20, objY + 20, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ff6243';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Dessiner un pistolet rigolo avec Canvas
            ctx.save();
            ctx.translate(obj.x + 20, objY + 20);
            
            // Fonction helper pour rectangle arrondi
            const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
              ctx.beginPath();
              ctx.moveTo(x + r, y);
              ctx.lineTo(x + w - r, y);
              ctx.quadraticCurveTo(x + w, y, x + w, y + r);
              ctx.lineTo(x + w, y + h - r);
              ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
              ctx.lineTo(x + r, y + h);
              ctx.quadraticCurveTo(x, y + h, x, y + h - r);
              ctx.lineTo(x, y + r);
              ctx.quadraticCurveTo(x, y, x + r, y);
              ctx.closePath();
            };
            
            // Corps du pistolet (rectangle arrondi)
            ctx.fillStyle = '#4a5568';
            roundRect(-12, -8, 20, 8, 3);
            ctx.fill();
            
            // Poignée
            ctx.fillStyle = '#2d3748';
            roundRect(-12, 0, 8, 12, 2);
            ctx.fill();
            
            // Canon
            ctx.fillStyle = '#1a202c';
            ctx.fillRect(8, -6, 8, 4);
            
            // Bout du canon (orange)
            ctx.fillStyle = '#ff6243';
            ctx.beginPath();
            ctx.arc(16, -4, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Détails rigolos (yeux)
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(-6, -4, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-2, -4, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Pupilles
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(-5, -4, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-1, -4, 1, 0, Math.PI * 2);
            ctx.fill();
            
            // Sourire
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(-4, 0, 3, 0.2, Math.PI - 0.2);
            ctx.stroke();
            
            ctx.restore();
          } else {
            ctx.fillStyle = '#84c19e';
            ctx.beginPath();
            ctx.arc(obj.x + 20, objY + 20, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🍎', obj.x + 20, objY + 20);
          }
        });

        // Dessiner les particules d'explosion
        gameDataRef.current.explosionParticles.forEach(particle => {
          const alpha = particle.life / particle.maxLife;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // Dessiner les balles (traits rouges)
        gameDataRef.current.bullets.forEach(bullet => {
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(bullet.x, bullet.y);
          ctx.lineTo(bullet.x + 10, bullet.y);
          ctx.stroke();
        });

        // Dessiner les explosions au sol
        gameDataRef.current.groundExplosions.forEach(explosion => {
          const alpha = explosion.life / explosion.maxLife;
          ctx.save();
          ctx.globalAlpha = alpha * 0.6;
          ctx.fillStyle = '#ff6243';
          ctx.beginPath();
          ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();
        });
      }
    }

    animationFrameRef.current = requestAnimationFrame(render);
  }, []);

  // Fonction pour réinitialiser complètement le jeu
  const resetGameData = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Réinitialiser toutes les variables du jeu
    gameDataRef.current.objects = [];
    gameDataRef.current.objectSpawnTimer = 0;
    gameDataRef.current.isJumping = false;
    gameDataRef.current.hasDoubleJumped = false;
    gameDataRef.current.isSpacePressed = false;
    gameDataRef.current.isDownPressed = false;
    gameDataRef.current.jumpChargeTime = 0;
    gameDataRef.current.playerX = canvas.width / 2;
    gameDataRef.current.playerY = gameDataRef.current.groundY - 200; // Position initiale en haut
    gameDataRef.current.playerVelY = 0;
    gameDataRef.current.currentLives = 3;
    gameDataRef.current.currentScore = 0;
    gameDataRef.current.fruitsCollected = 0;
    gameDataRef.current.speedMultiplier = 1; // Réinitialiser le multiplicateur de vitesse
    setSpeedMultiplier(1); // Réinitialiser l'état de la jauge
    gameDataRef.current.airBombTimer = 0;
    gameDataRef.current.groundExplosions = [];
    gameDataRef.current.explosionParticles = []; // Réinitialiser les particules
    gameDataRef.current.gunCount = 0; // Réinitialiser les pistolets
    gameDataRef.current.hasJetpack = false; // Réinitialiser le jetpack
    gameDataRef.current.isJetpackActive = false;
    gameDataRef.current.lastJetpackSoundTime = 0;
    gameDataRef.current.bullets = []; // Réinitialiser les balles
    gameDataRef.current.lastShotTime = 0; // Réinitialiser le temps de tir
  }, []);

  // Fonction pour démarrer le jeu
  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Réinitialiser toutes les données du jeu
    resetGameData();
    
    // Positionner le joueur au sol
    gameDataRef.current.playerY = gameDataRef.current.groundY;
    
    // Mettre à jour l'état
    updateGameState('playing');
    setLives(3);
    setScore(0);
  }, [updateGameState, resetGameData]);

  // Gestion des touches
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (state === 'idle') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === ' ' || 
            e.key === 'q' || e.key === 'Q' || e.key === 'd' || e.key === 'D' || e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          
          // Réinitialiser complètement le jeu avant de commencer
          resetGameData();
          
          // Faire tomber la mascotte
          updateGameState('ready');
          
          const fallInterval = setInterval(() => {
            if (gameDataRef.current.playerY < gameDataRef.current.groundY) {
              gameDataRef.current.playerY += 10;
            } else {
              clearInterval(fallInterval);
              gameDataRef.current.playerY = gameDataRef.current.groundY;
              
              // Afficher READY? puis décompte
              setTimeout(() => {
                updateGameState('countdown');
                let count = 3;
                setCountdown(count);
                
                const countdownInterval = setInterval(() => {
                  count--;
                  if (count > 0) {
                    setCountdown(count);
                  } else if (count === 0) {
                    setCountdown(null);
                    setTimeout(() => {
                      clearInterval(countdownInterval);
                      startGame();
                    }, 500);
                  }
                }, 1000);
              }, 500);
            }
          }, 16);
        }
      }
    };

    const handleKeyDownJump = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      if (state === 'playing') {
        // Z ou Flèche haut : saut ou jetpack
        if (e.key === 'ArrowUp' || e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          
          // Si on a le jetpack, activer le mode vol
          if (gameDataRef.current.hasJetpack) {
            gameDataRef.current.isJetpackActive = true;
            gameDataRef.current.isJumping = true; // On est en l'air
            keysPressedRef.current.add('JetpackUp'); // Marquer la touche comme pressée
          } else {
            // Comportement normal de saut
            if (!gameDataRef.current.isJumping && gameDataRef.current.playerY >= gameDataRef.current.groundY) {
              // Démarrer le saut normal
              gameDataRef.current.isJumping = true;
              gameDataRef.current.hasDoubleJumped = false;
              gameDataRef.current.isSpacePressed = true;
              gameDataRef.current.jumpChargeTime = 0;
              gameDataRef.current.playerVelY = -400; // Force de saut de base
            } else if (gameDataRef.current.isJumping && !gameDataRef.current.hasDoubleJumped && gameDataRef.current.playerY < gameDataRef.current.groundY) {
              // Double saut : petit saut supplémentaire en l'air (une seule fois)
              gameDataRef.current.hasDoubleJumped = true;
              gameDataRef.current.playerVelY = -350; // Force de double saut augmentée
            } else if (gameDataRef.current.isJumping && gameDataRef.current.isSpacePressed) {
              // Si on est déjà en train de sauter, continuer à charger
              gameDataRef.current.isSpacePressed = true;
            }
          }
        } else if (e.key === ' ') {
          // Barre espace : uniquement pour tirer (si on a le pistolet)
          e.preventDefault();
          if (gameDataRef.current.gunCount > 0) {
            keysPressedRef.current.add('Space');
            // Tirer immédiatement au premier appui
            handleShoot();
          }
        }
      }
    };

    const handleKeyUpJump = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'z' || e.key === 'Z') {
        if (gameDataRef.current.hasJetpack) {
          // Désactiver le jetpack quand on relâche la touche
          gameDataRef.current.isJetpackActive = false;
          keysPressedRef.current.delete('JetpackUp');
        } else {
          gameDataRef.current.isSpacePressed = false;
          gameDataRef.current.jumpChargeTime = 0;
        }
      } else if (e.key === ' ') {
        // Arrêter le tir en rafale quand on relâche la barre espace
        keysPressedRef.current.delete('Space');
      }
    };

    // Gérer la flèche du bas pour plonger
    const handleKeyDownDive = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      if (state === 'playing' && (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (gameDataRef.current.isJumping && gameDataRef.current.playerY < gameDataRef.current.groundY) {
          gameDataRef.current.isDownPressed = true;
        }
      }
    };

    const handleKeyUpDive = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        gameDataRef.current.isDownPressed = false;
      }
    };

    // Gérer le tir
    const handleShoot = () => {
      const state = gameStateRef.current;
      if (state === 'playing' && gameDataRef.current.gunCount > 0) {
        const canvas = canvasRef.current;
        if (canvas) {
          const now = performance.now();
          // Cadence de tir : 200ms pour 1-2 pistolets, 100ms pour 3 pistolets
          const fireRate = gameDataRef.current.gunCount >= 3 ? 100 : 200;
          if (now - gameDataRef.current.lastShotTime > fireRate) {
            gameDataRef.current.lastShotTime = now;
            
            const playerX = gameDataRef.current.playerX;
            const playerY = gameDataRef.current.playerY;
            
            // 1 pistolet : 1 balle
            // 2+ pistolets : 3 balles (une au centre, une en haut, une en bas)
            if (gameDataRef.current.gunCount === 1) {
              gameDataRef.current.bullets.push({
                x: playerX,
                y: playerY,
                speed: 600,
              });
            } else {
              // 2 ou 3 pistolets : tirer 3 balles
              gameDataRef.current.bullets.push({
                x: playerX,
                y: playerY - 15, // Balle en haut
                speed: 600,
              });
              gameDataRef.current.bullets.push({
                x: playerX,
                y: playerY, // Balle au centre
                speed: 600,
              });
              gameDataRef.current.bullets.push({
                x: playerX,
                y: playerY + 15, // Balle en bas
                speed: 600,
              });
            }
            
            // Son de tir
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
              oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.05);
              
              gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.1);
            } catch (error) {
              // Ignorer les erreurs audio
            }
          }
        }
      }
    };

    // Gérer le clic de souris pour tirer
    const handleMouseClick = (e: MouseEvent) => {
      const state = gameStateRef.current;
      if (state === 'playing' && gameDataRef.current.gunCount > 0 && e.button === 0) {
        e.preventDefault();
        handleShoot();
      }
    };

    // Gérer le déplacement continu en mode playing
    const handleKeyDownPlaying = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      if (state === 'playing') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'q' || e.key === 'Q' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          // Normaliser les touches ZQSD vers les flèches pour la gestion unifiée
          if (e.key === 'q' || e.key === 'Q') {
            keysPressedRef.current.add('ArrowLeft');
          } else if (e.key === 'd' || e.key === 'D') {
            keysPressedRef.current.add('ArrowRight');
          } else {
            keysPressedRef.current.add(e.key);
          }
        } else if (e.key === 'Control') {
          keysPressedRef.current.add('Control');
        }
      }
    };

    const handleKeyUpPlaying = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'q' || e.key === 'Q' || e.key === 'd' || e.key === 'D') {
        // Normaliser les touches ZQSD vers les flèches pour la gestion unifiée
        if (e.key === 'q' || e.key === 'Q') {
          keysPressedRef.current.delete('ArrowLeft');
        } else if (e.key === 'd' || e.key === 'D') {
          keysPressedRef.current.delete('ArrowRight');
        } else {
          keysPressedRef.current.delete(e.key);
        }
      } else if (e.key === 'Control') {
        keysPressedRef.current.delete('Control');
      }
    };
    
    window.addEventListener('keydown', handleKeyDownPlaying);
    window.addEventListener('keyup', handleKeyUpPlaying);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDownJump);
    window.addEventListener('keyup', handleKeyUpJump);
    window.addEventListener('keydown', handleKeyDownDive);
    window.addEventListener('keyup', handleKeyUpDive);
    window.addEventListener('click', handleMouseClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleKeyDownJump);
      window.removeEventListener('keyup', handleKeyUpJump);
      window.removeEventListener('keydown', handleKeyDownDive);
      window.removeEventListener('keyup', handleKeyUpDive);
      window.removeEventListener('click', handleMouseClick);
      window.removeEventListener('keydown', handleKeyDownPlaying);
      window.removeEventListener('keyup', handleKeyUpPlaying);
    };
  }, [updateGameState, startGame, resetGameData]);

  // Boucle de jeu
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialiser les dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gameDataRef.current.groundY = canvas.height - 100;
      gameDataRef.current.playerX = canvas.width / 2;
      if (gameStateRef.current === 'idle') {
        gameDataRef.current.playerY = gameDataRef.current.groundY - 200;
      } else {
        gameDataRef.current.playerY = gameDataRef.current.groundY;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Démarrer la boucle de rendu
    render();

    // Boucle de jeu
    let lastTime = performance.now();
    const gameLoop = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000; // Delta time en secondes
      lastTime = now;

      const state = gameStateRef.current;

      if (state === 'playing') {
        const { playerX, playerY, objects } = gameDataRef.current;

        // Gérer le déplacement horizontal (vitesse constante, indépendante de la vitesse du jeu)
        const baseMoveSpeed = 350; // pixels par seconde (vitesse constante du personnage)
        const speedMultiplier = keysPressedRef.current.has('Control') ? 1.5 : 1; // Accélération avec Ctrl
        const moveSpeed = baseMoveSpeed * speedMultiplier; // Ne pas utiliser gameDataRef.current.speedMultiplier pour le personnage
        
        if (keysPressedRef.current.has('ArrowLeft')) {
          gameDataRef.current.playerX = Math.max(50, gameDataRef.current.playerX - moveSpeed * dt);
        }
        if (keysPressedRef.current.has('ArrowRight')) {
          gameDataRef.current.playerX = Math.min(canvas.width - 50, gameDataRef.current.playerX + moveSpeed * dt);
        }

        // Tir en rafale si la barre espace est maintenue
        if (keysPressedRef.current.has('Space') && gameDataRef.current.gunCount > 0) {
          const now = performance.now();
          // Cadence de tir : 200ms pour 1-2 pistolets, 100ms pour 3 pistolets
          const fireRate = gameDataRef.current.gunCount >= 3 ? 100 : 200;
          if (now - gameDataRef.current.lastShotTime > fireRate) {
            gameDataRef.current.lastShotTime = now;
            
            const playerX = gameDataRef.current.playerX;
            const playerY = gameDataRef.current.playerY;
            
            // 1 pistolet : 1 balle
            // 2+ pistolets : 3 balles (une au centre, une en haut, une en bas)
            if (gameDataRef.current.gunCount === 1) {
              gameDataRef.current.bullets.push({
                x: playerX,
                y: playerY,
                speed: 600,
              });
            } else {
              // 2 ou 3 pistolets : tirer 3 balles
              gameDataRef.current.bullets.push({
                x: playerX,
                y: playerY - 15, // Balle en haut
                speed: 600,
              });
              gameDataRef.current.bullets.push({
                x: playerX,
                y: playerY, // Balle au centre
                speed: 600,
              });
              gameDataRef.current.bullets.push({
                x: playerX,
                y: playerY + 15, // Balle en bas
                speed: 600,
              });
            }
            
            // Son de tir
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
              oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.05);
              
              gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.1);
            } catch (error) {
              // Ignorer les erreurs audio
            }
          }
        }

        // Physique du joueur
        if (gameDataRef.current.isJumping || gameDataRef.current.hasJetpack) {
          // Si le jetpack est actif, propulsion continue vers le haut
          if (gameDataRef.current.isJetpackActive && gameDataRef.current.hasJetpack && gameDataRef.current.jetpackFuel > 0) {
            // Consommer du carburant
            gameDataRef.current.jetpackFuel = Math.max(0, gameDataRef.current.jetpackFuel - dt * 6); // Consomme 6% par seconde (5x plus lent)
            setJetpackFuel(gameDataRef.current.jetpackFuel);
            
            // Si le carburant est épuisé, désactiver le jetpack et réinitialiser la vélocité
            if (gameDataRef.current.jetpackFuel <= 0) {
              gameDataRef.current.isJetpackActive = false;
              gameDataRef.current.hasJetpack = false;
              // Réinitialiser la vélocité pour que la gravité reprenne immédiatement
              // Ne pas mettre à 0, mais laisser la gravité agir naturellement
            } else {
              // Force de propulsion constante vers le haut (plus forte que la gravité)
              gameDataRef.current.playerVelY = -400; // Force constante vers le haut
              
              // Créer des particules de propulsion en dessous du personnage
              createJetpackThrust(
                gameDataRef.current.playerX,
                gameDataRef.current.playerY + 40 // En dessous du personnage
              );
              
              // Son de fusée (joué à chaque frame mais avec un délai pour éviter la surcharge)
              const now = performance.now();
              if (!gameDataRef.current.lastJetpackSoundTime || now - gameDataRef.current.lastJetpackSoundTime > 100) {
                gameDataRef.current.lastJetpackSoundTime = now;
                try {
                  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const oscillator = audioContext.createOscillator();
                  const gainNode = audioContext.createGain();
                  
                  oscillator.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  
                  // Son de fusée (fréquence basse avec bruit)
                  oscillator.type = 'sawtooth';
                  oscillator.frequency.setValueAtTime(60 + Math.random() * 40, audioContext.currentTime);
                  
                  gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                  
                  oscillator.start(audioContext.currentTime);
                  oscillator.stop(audioContext.currentTime + 0.1);
                } catch (error) {
                  // Ignorer les erreurs audio
                }
              }
            }
          } else if (!gameDataRef.current.hasJetpack) {
            // Si la barre espace est maintenue, augmenter la force du saut (sans jetpack)
            if (gameDataRef.current.isSpacePressed && gameDataRef.current.playerVelY < 0) {
              gameDataRef.current.jumpChargeTime += dt;
              if (gameDataRef.current.jumpChargeTime < gameDataRef.current.maxJumpCharge) {
                // Augmenter progressivement la vélocité vers le haut (jusqu'à -600 au lieu de -400)
                const chargeRatio = gameDataRef.current.jumpChargeTime / gameDataRef.current.maxJumpCharge;
                const additionalForce = -200 * chargeRatio; // Force supplémentaire jusqu'à -200
                gameDataRef.current.playerVelY = Math.max(-600, -400 + additionalForce);
              }
            }
          }

          // Si la flèche du bas est pressée, augmenter la gravité (plongeon) - sauf si jetpack actif avec carburant
          const isJetpackReallyActive = gameDataRef.current.isJetpackActive && gameDataRef.current.hasJetpack && gameDataRef.current.jetpackFuel > 0;
          const gravity = (gameDataRef.current.isDownPressed && !isJetpackReallyActive) ? 1600 : 800; // Double gravité si on plonge (mais pas avec jetpack actif)
          
          // Appliquer la gravité seulement si le jetpack n'est pas vraiment actif (avec carburant)
          if (!isJetpackReallyActive) {
            gameDataRef.current.playerVelY += gravity * dt;
          }
          
          gameDataRef.current.playerY += gameDataRef.current.playerVelY * dt;

          if (gameDataRef.current.playerY >= gameDataRef.current.groundY) {
            gameDataRef.current.playerY = gameDataRef.current.groundY;
            gameDataRef.current.playerVelY = 0;
            gameDataRef.current.isJumping = false;
            gameDataRef.current.hasDoubleJumped = false;
            gameDataRef.current.isSpacePressed = false;
            gameDataRef.current.isDownPressed = false;
            gameDataRef.current.jumpChargeTime = 0;
            // Si on atterrit, désactiver le jetpack
            if (gameDataRef.current.hasJetpack && gameDataRef.current.playerY >= gameDataRef.current.groundY) {
              gameDataRef.current.isJetpackActive = false;
            }
          }
        }

        // Déplacer les objets avec leur vitesse individuelle
        gameDataRef.current.objects = objects.map(obj => {
          let oscillationOffset = obj.oscillationOffset || 0;
          let oscillationTime = obj.oscillationTime || 0;
          
          // Animation d'oscillation pour les cœurs, pistolets, jetpacks et slowdown
          if (obj.type === 'heart' || obj.type === 'gun' || obj.type === 'jetpack' || obj.type === 'slowdown') {
            oscillationTime += dt * 3; // Vitesse d'oscillation
            oscillationOffset = Math.sin(oscillationTime) * 15; // Amplitude de 15 pixels
          }
          
          // Gérer les bombes aériennes qui tombent du ciel
          if (obj.type === 'airBomb') {
            const velY = obj.velY || 0;
            const velX = obj.velX || 0; // Vélocité horizontale (pour les bombes qui tombent de côté)
            const newVelY = velY + 600 * dt; // Gravité
            const newY = obj.y + newVelY * dt;
            const newX = obj.x + velX * dt; // Déplacement horizontal
            
            // Si la bombe touche le sol ou sort de l'écran horizontalement, créer une explosion
            if (newY >= gameDataRef.current.groundY - 20 || newX < -50 || newX > canvas.width + 50) {
              // Créer une explosion au sol (ou à la position actuelle si elle sort de l'écran)
              const explosionX = newX < -50 || newX > canvas.width + 50 ? obj.x : newX;
              const explosionY = newY >= gameDataRef.current.groundY - 20 ? gameDataRef.current.groundY : newY;
              
              gameDataRef.current.groundExplosions.push({
                x: explosionX,
                y: explosionY,
                radius: 0,
                life: 0.5, // Durée de l'explosion
                maxLife: 0.5,
              });
              
              // Créer des particules d'explosion
              createExplosion(explosionX, explosionY);
              
              // Jouer le son de crash
              try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
                
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.15);
              } catch (error) {
                // Ignorer les erreurs audio
              }
              
              // Supprimer la bombe
              return null;
            }
            
            return {
              ...obj,
              x: newX,
              y: newY,
              velY: newVelY,
              velX: velX, // Conserver la vélocité horizontale
            };
          }
          
          return {
            ...obj,
            x: obj.x - obj.speed * dt, // Utiliser la vitesse individuelle de chaque objet
            oscillationOffset,
            oscillationTime,
          };
        }).filter(obj => obj !== null && (obj.type === 'airBomb' ? obj.y < canvas.height + 50 : obj.x > -50)) as GameObject[]; // Supprimer les objets hors écran

        // Mettre à jour les particules d'explosion
        gameDataRef.current.explosionParticles = gameDataRef.current.explosionParticles
          .map(particle => {
            const newLife = particle.life - dt * 2; // Fade out en 0.5 secondes
            return {
              ...particle,
              x: particle.x + particle.vx * dt,
              y: particle.y + particle.vy * dt,
              life: Math.max(0, newLife),
              vy: particle.vy + 300 * dt, // Gravité pour les particules
            };
          })
          .filter(particle => particle.life > 0);

        // Mettre à jour les balles
        gameDataRef.current.bullets = gameDataRef.current.bullets
          .map(bullet => ({
            ...bullet,
            x: bullet.x + bullet.speed * dt,
          }))
          .filter(bullet => bullet.x < canvas.width + 50); // Supprimer les balles hors écran

        // Vérifier les collisions entre balles et bombes
        gameDataRef.current.bullets.forEach((bullet, bulletIndex) => {
          gameDataRef.current.objects.forEach((obj, objIndex) => {
            if (obj.type === 'bomb') {
              const objY = obj.y + (obj.oscillationOffset || 0);
              const distance = Math.sqrt(
                Math.pow(bullet.x - (obj.x + 20), 2) + Math.pow(bullet.y - (objY + 20), 2)
              );
              
              if (distance < 25) { // Collision détectée
                // Créer l'explosion
                createExplosion(obj.x + 20, objY + 20);
                // Jouer le son de crash
                try {
                  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const oscillator = audioContext.createOscillator();
                  const gainNode = audioContext.createGain();
                  
                  oscillator.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  
                  // Son de crash (fréquence qui descend rapidement)
                  oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                  oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
                  
                  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                  
                  oscillator.start(audioContext.currentTime);
                  oscillator.stop(audioContext.currentTime + 0.15);
                } catch (error) {
                  // Ignorer les erreurs audio
                }
                // Supprimer la bombe et la balle
                gameDataRef.current.objects.splice(objIndex, 1);
                gameDataRef.current.bullets.splice(bulletIndex, 1);
                // Donner des points pour avoir détruit une bombe
                gameDataRef.current.currentScore += 5;
                setScore(gameDataRef.current.currentScore);
              }
            }
          });
        });

        // Générer des objets (intervalle plus long pour ralentir)
        gameDataRef.current.objectSpawnTimer += dt;
        // Intervalle de spawn augmente légèrement avec la vitesse pour équilibrer
        const spawnInterval = 2.5 - (gameDataRef.current.speedMultiplier - 1) * 0.2; // Entre 2.5s et 2.3s
        if (gameDataRef.current.objectSpawnTimer > Math.max(2.0, spawnInterval)) {
          spawnObject(canvas);
          gameDataRef.current.objectSpawnTimer = 0;
        }

        // Générer des bombes aériennes si le score >= 1000
        if (gameDataRef.current.currentScore >= 100) {
          gameDataRef.current.airBombTimer += dt;
          // Spawn une bombe aérienne toutes les 3-5 secondes (aléatoire)
          const airBombInterval = 3 + Math.random() * 2; // Entre 3 et 5 secondes
          if (gameDataRef.current.airBombTimer > airBombInterval) {
            gameDataRef.current.airBombTimer = 0;
            
            // Au-delà de 500 points, certaines bombes tombent de côté (en diagonale) et d'autres tout droit
            const score = gameDataRef.current.currentScore;
            const canFallFromSide = score >= 500;
            
            let randomX: number;
            let velX: number = 0;
            
            // Si on peut tomber de côté, 50% de chance de tomber en biais, 50% tout droit
            if (canFallFromSide && Math.random() < 0.5) {
              // Choisir un côté aléatoire (gauche ou droite) pour tomber en biais
              const fromLeft = Math.random() < 0.5;
              if (fromLeft) {
                randomX = -50; // Commence à gauche de l'écran
                velX = 100 + Math.random() * 100; // Vitesse horizontale vers la droite (100-200)
              } else {
                randomX = canvas.width + 50; // Commence à droite de l'écran
                velX = -(100 + Math.random() * 100); // Vitesse horizontale vers la gauche (-100 à -200)
              }
            } else {
              // Tombe verticalement du haut (comme avant)
              randomX = 100 + Math.random() * (canvas.width - 200); // Position X aléatoire
              velX = 0; // Pas de mouvement horizontal
            }
            
            // Créer une bombe aérienne
            gameDataRef.current.objects.push({
              x: randomX,
              y: -50, // Commence en haut de l'écran
              width: 40,
              height: 40,
              type: 'airBomb',
              speed: 0, // Ne bouge pas horizontalement (on utilise velX à la place)
              velY: 0, // Commence avec une vélocité verticale de 0
              velX: velX, // Vélocité horizontale (0 si tombe tout droit, sinon vers le centre)
            });
          }
        }

        // Mettre à jour les explosions au sol
        gameDataRef.current.groundExplosions = gameDataRef.current.groundExplosions
          .map(explosion => {
            const newLife = explosion.life - dt;
            const progress = 1 - (newLife / explosion.maxLife);
            return {
              ...explosion,
              life: Math.max(0, newLife),
              radius: progress * 100, // Rayon d'explosion jusqu'à 100 pixels
            };
          })
          .filter(explosion => explosion.life > 0);

        // Vérifier les collisions avec les explosions au sol
        gameDataRef.current.groundExplosions.forEach(explosion => {
          const distance = Math.sqrt(
            Math.pow(gameDataRef.current.playerX - explosion.x, 2) +
            Math.pow(gameDataRef.current.playerY - explosion.y, 2)
          );
          
          // Si le joueur est dans le rayon d'explosion
          if (distance < explosion.radius + 40) { // 40 = rayon approximatif du joueur
            // Perdre une vie
            const newLives = Math.max(0, gameDataRef.current.currentLives - 1);
            gameDataRef.current.currentLives = newLives;
            setLives(newLives);
            
            // Jouer le son "ouch"
            playSound('bomb');
            
            // Créer une explosion sur le joueur
            createExplosion(gameDataRef.current.playerX, gameDataRef.current.playerY);
            
            // Supprimer l'explosion pour éviter de perdre plusieurs vies
            explosion.life = 0;
            
            // Game over si plus de vies
            if (newLives === 0) {
              updateGameState('gameover');
              // Vérifier si le score est dans le top 10
              if (isOnline) {
                checkIfTop10(gameDataRef.current.currentScore).then((top10) => {
                  setIsTop10(top10);
                  if (top10) {
                    setShowNameInput(true);
                  }
                  loadLeaderboard();
                });
              }
            }
          }
        });

        // Vérifier les collisions
        const playerRect = {
          x: playerX - 40,
          y: playerY - 40,
          width: 80,
          height: 80,
        };

        gameDataRef.current.objects.forEach((obj, index) => {
          const objY = obj.y + (obj.oscillationOffset || 0); // Position Y avec oscillation
          const objRect = {
            x: obj.x,
            y: objY,
            width: obj.width,
            height: obj.height,
          };

          if (
            playerRect.x < objRect.x + objRect.width &&
            playerRect.x + playerRect.width > objRect.x &&
            playerRect.y < objRect.y + objRect.height &&
            playerRect.y + playerRect.height > objRect.y
          ) {
            // Collision détectée
            if (obj.type === 'bomb') {
              // Créer l'explosion à la position de collision
              createExplosion(obj.x + 20, objY + 20);
              // Jouer le son "ouch"
              playSound('bomb');
              
              // Perdre tous les pistolets si on en a
              gameDataRef.current.gunCount = 0;
              // Perdre aussi le jetpack et son carburant
              gameDataRef.current.hasJetpack = false;
              gameDataRef.current.jetpackFuel = 0;
              setJetpackFuel(0);
              
              const newLives = gameDataRef.current.currentLives - 1;
              gameDataRef.current.currentLives = newLives;
              setLives(newLives);
              if (newLives <= 0) {
                updateGameState('gameover');
                gameDataRef.current.objects = [];
                // Vérifier si le score est dans le top 10
                if (isOnline) {
                  checkIfTop10(gameDataRef.current.currentScore).then((top10) => {
                    setIsTop10(top10);
                    if (top10) {
                      setShowNameInput(true);
                    }
                    loadLeaderboard();
                  });
                }
              }
            } else if (obj.type === 'fruit') {
              // Jouer le son de collecte
              playSound('fruit');
              
              gameDataRef.current.currentScore += 10;
              gameDataRef.current.fruitsCollected += 1;
              setScore(gameDataRef.current.currentScore);
              
              // Augmenter la vitesse de manière continue et progressive
              // Chaque fruit augmente la vitesse des objets
              gameDataRef.current.speedMultiplier += 0.15; // Augmentation continue et progressive (équilibrée)
              setSpeedMultiplier(gameDataRef.current.speedMultiplier); // Mettre à jour l'état pour la jauge
          } else if (obj.type === 'heart') {
            // Jouer le son de collecte (même son que les fruits)
            playSound('fruit');
              
            // Ajouter une vie (peut dépasser 3)
            const newLives = gameDataRef.current.currentLives + 1;
            gameDataRef.current.currentLives = newLives;
            setLives(newLives);
          } else if (obj.type === 'gun') {
            // Jouer le son de collecte
            playSound('fruit');
            
            // Donner le pistolet au joueur
            // Ajouter un pistolet (maximum 3)
            if (gameDataRef.current.gunCount < 3) {
              gameDataRef.current.gunCount += 1;
            }
          } else if (obj.type === 'jetpack') {
            // Jouer le son de collecte
            playSound('fruit');
            
            // Recharger le carburant du jetpack (ou donner le jetpack si on ne l'a pas)
            gameDataRef.current.jetpackFuel = Math.min(100, gameDataRef.current.jetpackFuel + 50); // Recharge de 50%
            setJetpackFuel(gameDataRef.current.jetpackFuel);
            gameDataRef.current.hasJetpack = true;
          } else if (obj.type === 'slowdown') {
            // Jouer le son de collecte
            playSound('fruit');
            
            // Réduire la vitesse (diminuer le multiplicateur de 0.15, minimum 0.5)
            const newSpeedMultiplier = Math.max(0.5, gameDataRef.current.speedMultiplier - 0.15);
            gameDataRef.current.speedMultiplier = newSpeedMultiplier;
            setSpeedMultiplier(newSpeedMultiplier); // Mettre à jour l'état pour la jauge
          }
            // Supprimer l'objet
            gameDataRef.current.objects.splice(index, 1);
          }
        });
      }

      requestAnimationFrame(gameLoop);
    };

    const gameLoopId = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Annuler la boucle de jeu
      if (gameLoopId !== null) {
        cancelAnimationFrame(gameLoopId);
      }
    };
  }, [render, spawnObject, updateGameState, createExplosion, playSound]);

  // Fonction pour réinitialiser le jeu (retour à l'état idle)
  const resetGame = useCallback(() => {
    // Réinitialiser toutes les données du jeu
    resetGameData();
    
    // Réinitialiser l'état React
    updateGameState('idle');
    setLives(3);
    setScore(0);
    setCountdown(null);
    setSpeedMultiplier(1);
    setJetpackFuel(0);
    setShowNameInput(false);
    setPlayerName('');
    setIsTop10(false);
    setScoreSaved(false);
  }, [updateGameState, resetGameData]);

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#FEF5F0] to-white">
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* UI Overlay */}
      {gameState === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-4">
              Utilisez les flèches pour déplacer la mascotte
            </p>
            <p className="text-sm text-gray-500">
              Appuyez sur Z, Espace ou une flèche pour commencer
            </p>
          </div>
        </div>
      )}

      {gameState === 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-8xl font-bold text-[#ff6243] animate-pulse">READY?</h1>
        </div>
      )}

      {gameState === 'countdown' && countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-8xl font-bold text-[#328fce] animate-bounce">{countdown}</h1>
        </div>
      )}

      {gameState === 'countdown' && countdown === null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-8xl font-bold text-[#84c19e] animate-pulse">GO!</h1>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <div className="absolute top-4 left-4 flex gap-2 z-10 flex-wrap max-w-[200px]">
            {[...Array(Math.max(3, lives))].map((_, i) => (
              <div
                key={i}
                className={`w-10 h-10 flex items-center justify-center text-2xl ${
                  i < lives ? '' : 'opacity-30'
                }`}
              >
                {i < lives ? '❤️' : '🤍'}
              </div>
            ))}
          </div>
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
            <p className="text-2xl font-bold text-gray-800 bg-white/80 px-4 py-2 rounded-lg">
              Score: {score}
            </p>
            {/* Jauge de vitesse */}
            <div className="bg-white/80 px-4 py-2 rounded-lg min-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-700">Vitesse</span>
                <span className="text-sm font-bold text-[#328fce]">
                  {Math.round(speedMultiplier * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#84c19e] via-[#328fce] to-[#ff6243] transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.sqrt(speedMultiplier / 5) * 100)}%`,
                  }}
                />
              </div>
            </div>
            {/* Top 3 */}
            {isOnline && top3.length > 0 && (
              <div className="bg-white/80 px-4 py-2 rounded-lg min-w-[180px]">
                <h3 className="text-sm font-bold text-gray-800 mb-2">🏆 Top 3</h3>
                <div className="space-y-1">
                  {top3.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="flex justify-between items-center text-xs"
                    >
                      <span className="font-bold text-gray-600">#{index + 1}</span>
                      <span className="font-mono text-gray-700">{entry.player_name}</span>
                      <span className="font-bold text-gray-800">{entry.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {gameState === 'playing' && (
        <div className="absolute bottom-4 left-4 z-10 text-sm text-gray-600 bg-white/80 px-4 py-2 rounded-lg">
          <p>Flèches/ZQSD: Déplacer | Z/Haut: Sauter | S/Bas: Plonger</p>
          {gameDataRef.current.gunCount > 0 && (
            <p className="mt-1 text-[#ff6243] font-bold">
              🔫 {gameDataRef.current.gunCount} Pistolet{gameDataRef.current.gunCount > 1 ? 's' : ''} - Espace pour tirer
              {gameDataRef.current.gunCount >= 2 && ' (Tirs épais)'}
              {gameDataRef.current.gunCount >= 3 && ' (Cadence rapide)'}
            </p>
          )}
          {gameDataRef.current.hasJetpack && gameDataRef.current.jetpackFuel > 0 && (
            <div className="mt-1">
              <p className="text-[#328fce] font-bold mb-1">
                🚀 Jetpack actif - Z/Haut pour voler
              </p>
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    jetpackFuel > 30 
                      ? 'bg-[#328fce]' 
                      : jetpackFuel > 10 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                  }`}
                  style={{
                    width: `${jetpackFuel}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Carburant: {Math.round(jetpackFuel)}%
              </p>
            </div>
          )}
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10 overflow-y-auto">
          <div className="bg-white rounded-lg p-8 text-center max-w-md w-full mx-4 my-8">
            <h2 className="text-4xl font-bold text-[#ff6243] mb-4">Game Over!</h2>
            <p className="text-2xl text-gray-800 mb-6">Score final: {score}</p>
            
            {showNameInput && isTop10 && !scoreSaved && (
              <div className="mb-6">
                <p className="text-lg text-gray-700 mb-4">🎉 Félicitations ! Vous êtes dans le top 10 !</p>
                <p className="text-sm text-gray-600 mb-4">Entrez 3 lettres pour votre nom :</p>
                <input
                  type="text"
                  maxLength={3}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                  className="text-2xl font-bold text-center w-24 px-4 py-2 border-2 border-[#328fce] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#328fce] uppercase"
                  placeholder="ABC"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && playerName.length === 3) {
                      saveScore(playerName, gameDataRef.current.currentScore);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (playerName.length === 3) {
                      saveScore(playerName, gameDataRef.current.currentScore);
                    }
                  }}
                  disabled={playerName.length !== 3}
                  className="mt-4 bg-[#328fce] text-white px-6 py-2 rounded-full hover:bg-[#2a7ab8] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enregistrer
                </button>
              </div>
            )}

            {scoreSaved && (
              <div className="mb-6">
                <p className="text-lg text-green-600 mb-4">✅ Score enregistré !</p>
              </div>
            )}

            {isOnline && leaderboard.length > 0 && (
              <div className="mb-6 text-left">
                <h3 className="text-xl font-bold text-gray-800 mb-3">🏆 Top 10</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`flex justify-between items-center p-2 rounded ${
                        entry.score === score && entry.player_name === playerName.toUpperCase().substring(0, 3)
                          ? 'bg-[#328fce] text-white'
                          : 'bg-gray-100'
                      }`}
                    >
                      <span className="font-bold">#{index + 1}</span>
                      <span className="font-mono">{entry.player_name}</span>
                      <span className="font-bold">{entry.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={resetGame}
                className="bg-[#328fce] text-white px-6 py-3 rounded-full hover:bg-[#2a7ab8] transition-all font-medium"
              >
                Rejouer
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="bg-gray-300 text-gray-800 px-6 py-3 rounded-full hover:bg-gray-400 transition-all font-medium"
                >
                  Retour
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
