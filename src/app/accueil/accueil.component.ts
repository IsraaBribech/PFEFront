import {
  Component,
  type OnInit,
  HostListener,
  type AfterViewInit,
  ElementRef,
  Renderer2,
} from "@angular/core"
import { Router } from "@angular/router"

@Component({
  selector: "app-accueil",
  templateUrl: "./accueil.component.html",
  styleUrls: ["./accueil.component.css"],
})
export class AccueilComponent implements OnInit, AfterViewInit {
  facultyInfo = {
    name: "Institut Supérieur de Gestion",
    shortDescription:
      "L'Institut Supérieur de Gestion de Gabès (ISGG) créé le 01/07/1998 par le décret N°468 du 23/02/1998 (J.O.R.T) du 03/03/1998 .",
  }

  facultyHighlights = [
    {
      icon: "fas fa-graduation-cap",
      text: "Excellence académique",
    },
    {
      icon: "fas fa-briefcase",
      text: "Insertion professionnelle",
    },
  ]

  espaces = [
    {
      title: "Espace Étudiant",
      icon: "fa-solid fa-user-graduate",
      description: "Accédez à vos cours, devoirs et quiz ",
      route: "/login",
    },
    {
      title: "Espace Enseignant",
      icon: "fa-solid fa-chalkboard-teacher",
      description: "Gérez vos cours et suivez vos étudiants",
      route: "/login",
    },
  ]

  private lastScrollTop = 0
  private observer!: IntersectionObserver

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Initialisation du composant
    console.log("Router disponible:", this.router)
  }

  ngAfterViewInit(): void {
    // S'assurer que la vidéo fonctionne en boucle
    this.ensureVideoLoop()

    // Configurer l'observateur d'intersection pour les animations
    this.setupIntersectionObserver()

    // Activer les animations initiales
    setTimeout(() => {
      this.activateInitialAnimations()
    }, 100)

    // Ajouter des écouteurs d'événements pour les boutons "Accéder"
    this.setupAccessButtons()
  }

  // Configurer les boutons d'accès avec des écouteurs d'événements explicites
  private setupAccessButtons(): void {
    const accessButtons = this.elementRef.nativeElement.querySelectorAll(".espace-button")
    accessButtons.forEach((button: HTMLElement) => {
      this.renderer.listen(button, "click", (event) => {
        event.preventDefault()
        event.stopPropagation()
        console.log("Bouton Accéder cliqué, navigation vers /login")
        this.router.navigate(["/login"])
      })
    })

    // Configurer également les liens du footer
    const footerLinks = this.elementRef.nativeElement.querySelectorAll(".footer-link-access")
    footerLinks.forEach((link: HTMLElement) => {
      this.renderer.listen(link, "click", (event) => {
        event.preventDefault()
        event.stopPropagation()
        console.log("Lien footer cliqué, navigation vers /login")
        this.router.navigate(["/login"])
      })
    })
  }

  // Méthode pour naviguer vers la page de login
  navigateToLogin(): void {
    console.log("Méthode navigateToLogin appelée")
    this.router.navigate(["/login"]).then(
      (success) => console.log("Navigation réussie:", success),
      (error) => console.error("Erreur de navigation:", error),
    )
  }

  // S'assurer que la vidéo fonctionne en boucle - Méthode améliorée
  private ensureVideoLoop(): void {
    const videoElement = document.getElementById("heroVideo") as HTMLVideoElement
    if (videoElement) {
      // Définir explicitement la propriété loop
      videoElement.loop = true

      // Ajouter un gestionnaire d'événements pour s'assurer que la vidéo redémarre
      videoElement.addEventListener("ended", () => {
        videoElement.currentTime = 0
        videoElement.play().catch((error) => {
          console.error("Erreur lors de la lecture de la vidéo:", error)
        })
      })

      // Forcer le démarrage de la vidéo
      videoElement.play().catch((error) => {
        console.log("Autoplay prevented:", error)

        // Ajouter un gestionnaire de clic pour démarrer la vidéo en cas d'échec de l'autoplay
        document.addEventListener(
          "click",
          () => {
            videoElement.play().catch((e) => console.error("Erreur lors de la lecture après clic:", e))
          },
          { once: true },
        )
      })

      // Vérifier périodiquement si la vidéo est en pause et la redémarrer si nécessaire
      setInterval(() => {
        if (videoElement.paused) {
          videoElement.play().catch((e) => console.error("Erreur lors de la reprise de la vidéo:", e))
        }
      }, 5000)
    }
  }

  // Configurer l'observateur d'intersection pour les animations au défilement
  private setupIntersectionObserver(): void {
    const options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.1,
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active")
          this.observer.unobserve(entry.target)
        }
      })
    }, options)

    // Observer tous les éléments avec les classes d'animation
    const animatedElements = this.elementRef.nativeElement.querySelectorAll(".fade-in, .slide-up")
    animatedElements.forEach((element: HTMLElement) => {
      this.observer.observe(element)
    })
  }

  // Activer les animations initiales (pour les éléments visibles au chargement)
  private activateInitialAnimations(): void {
    const heroElements = this.elementRef.nativeElement.querySelectorAll(
      ".hero-section .fade-in, .hero-section .slide-up",
    )
    heroElements.forEach((element: HTMLElement, index: number) => {
      setTimeout(() => {
        element.classList.add("active")
      }, index * 200)
    })
  }

  @HostListener("window:scroll", [])
  onWindowScroll() {
    // Gestion de la navbar
    const header = document.querySelector(".header") as HTMLElement
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop

    if (scrollTop > this.lastScrollTop && scrollTop > 100) {
      // Défilement vers le bas - cacher la navbar
      header.style.transform = "translateY(-100%)"
    } else {
      // Défilement vers le haut - montrer la navbar
      header.style.transform = "translateY(0)"
    }

    this.lastScrollTop = scrollTop
  }
}
