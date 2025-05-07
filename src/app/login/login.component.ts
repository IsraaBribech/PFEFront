import { Component, type OnInit, type AfterViewInit, ElementRef, Renderer2 } from "@angular/core"
import { FormBuilder, type FormGroup, Validators } from "@angular/forms"
import { Router } from "@angular/router"
import { AuthService } from "../auth.service"
import { UserService } from "../user.service" // Importer UserService directement

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class LoginComponent implements OnInit, AfterViewInit {
  loginForm!: FormGroup
  isSubmitting = false
  errorMessage = ""
  hidePassword = true

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private el: ElementRef,
    private renderer: Renderer2,
    private authService: AuthService,
    private userService: UserService, // Injecter UserService directement
  ) {}

  ngOnInit(): void {
    this.initForm()
    this.createParticles()
  }

  ngAfterViewInit(): void {
    // Démarrer la lecture vidéo après le rendu du composant
    setTimeout(() => {
      this.startVideoPlayback()
    }, 100)
  }

  initForm(): void {
    this.loginForm = this.fb.group({
      identifier: ["", [Validators.required]], // Email ou CIN
      password: ["", [Validators.required, Validators.minLength(6)]],
      rememberMe: [false], // Pour l'option "Se souvenir de moi"
    })
  }

  // Méthode améliorée pour démarrer la lecture vidéo automatiquement
  private startVideoPlayback(): void {
    const videoElement = this.el.nativeElement.querySelector("#loginVideo") as HTMLVideoElement

    if (videoElement) {
      // Définir explicitement la propriété de boucle
      this.renderer.setAttribute(videoElement, "loop", "true")
      this.renderer.setAttribute(videoElement, "autoplay", "true")
      this.renderer.setAttribute(videoElement, "muted", "true")
      this.renderer.setAttribute(videoElement, "playsinline", "true")

      // Fonction pour démarrer la vidéo
      const playVideo = () => {
        videoElement.play().catch((error: Error) => {
          console.warn("Lecture automatique empêchée:", error)

          // Si la lecture automatique est bloquée, essayer de démarrer la vidéo lors d'une interaction utilisateur
          const startPlayback = () => {
            videoElement.play().catch((e: Error) => console.error("Erreur de lecture après interaction:", e))
            document.removeEventListener("click", startPlayback)
            document.removeEventListener("touchstart", startPlayback)
            document.removeEventListener("keydown", startPlayback)
          }

          document.addEventListener("click", startPlayback)
          document.addEventListener("touchstart", startPlayback)
          document.addEventListener("keydown", startPlayback)
        })
      }

      // Essayer de démarrer la vidéo immédiatement
      playVideo()

      // Ajouter un gestionnaire d'événements pour s'assurer que la vidéo redémarre si elle se termine
      videoElement.addEventListener("ended", () => {
        videoElement.currentTime = 0
        playVideo()
      })

      // Vérifier périodiquement si la vidéo est en pause et la redémarrer si nécessaire
      const checkInterval = setInterval(() => {
        if (videoElement.paused) {
          playVideo()
        }
      }, 2000)

      // Nettoyer l'intervalle lorsque le composant est détruit
      this.renderer.listen("window", "beforeunload", () => {
        clearInterval(checkInterval)
      })
    }
  }

  // Méthode pour créer des particules animées dynamiquement
  createParticles(): void {
    const particlesContainer = document.querySelector(".particles")
    if (particlesContainer) {
      for (let i = 0; i < 20; i++) {
        const particle = document.createElement("div")
        particle.classList.add("particle")

        // Position aléatoire
        const left = Math.random() * 100
        particle.style.left = `${left}%`

        // Taille aléatoire
        const size = Math.random() * 5 + 2
        particle.style.width = `${size}px`
        particle.style.height = `${size}px`

        // Délai d'animation aléatoire
        const delay = Math.random() * 30
        particle.style.animationDelay = `${delay}s`

        // Durée d'animation aléatoire
        const duration = Math.random() * 20 + 10
        particle.style.animationDuration = `${duration}s`

        particlesContainer.appendChild(particle)
      }
    }
  }

  // Méthode onSubmit améliorée pour utiliser le service d'authentification centralisé
  onSubmit(): void {
    if (this.loginForm.invalid) {
      return
    }

    this.isSubmitting = true
    this.errorMessage = ""

    const credentials = {
      identifier: this.loginForm.value.identifier,
      password: this.loginForm.value.password,
    }

    console.log("Tentative de connexion avec:", credentials.identifier);

    // Utiliser le service d'authentification centralisé
    this.authService.authenticate(credentials).subscribe({
      next: (response: any) => {
        console.log("Authentification réussie:", response)

        // La redirection est gérée par le service d'authentification
        const userRole = this.authService.getUserRole()

        if (userRole === "teacher") {
          console.log("Redirection vers l'interface enseignant");
          this.router.navigate(["/deuxieme-interface"])
        } else if (userRole === "student") {
          // Pour les étudiants, vérifier si nous avons bien récupéré leurs informations
          const studentInfo = this.authService.getStudentInfo()
          if (!studentInfo) {
            console.warn("Informations étudiant non disponibles après authentification")
          } else {
            console.log("Informations étudiant récupérées avec succès:", studentInfo)
          }
          console.log("Redirection vers l'interface étudiant");
          this.router.navigate(["/troixieme-interface"])
        } else {
          // Solution de repli au cas où le rôle n'est pas défini
          console.log("Rôle non défini, redirection vers la page d'accueil");
          this.router.navigate(["/"])
        }

        this.isSubmitting = false
      },
      error: (error: Error) => {
        console.error("Échec de l'authentification:", error)
        this.errorMessage = error.message || "Identifiants invalides"
        this.isSubmitting = false
      },
    })
  }

  // Méthode forgotPassword supprimée

  // Méthode de débogage pour l'authentification
  debugAuthentication(): void {
    console.log("--- ÉTAT D'AUTHENTIFICATION ---")
    console.log("Utilisateur actuel:", this.authService.getCurrentUser())
    console.log("Est authentifié:", this.authService.isAuthenticated())
    console.log("Rôle:", this.authService.getUserRole())
    console.log("Est enseignant:", this.authService.isTeacher())
    console.log("Est étudiant:", this.authService.isStudent())
    console.log("Token:", this.authService.getToken())
    console.log("Informations étudiant:", this.authService.getStudentInfo())

    // Tester directement l'API d'authentification des étudiants
    const credentials = {
      identifier: this.loginForm.value.identifier || "33333333",
      password: this.loginForm.value.password || "******",
    }

    console.log("Test direct de l'API d'authentification des étudiants...")
    // Utiliser userService directement au lieu de l'accéder via authService
    this.userService.authenticateStudent(credentials).subscribe({
      next: (response: any) => console.log("Réponse:", response),
      error: (error: any) => console.error("Erreur:", error),
    })
  }

  get f() {
    return this.loginForm.controls
  }
}