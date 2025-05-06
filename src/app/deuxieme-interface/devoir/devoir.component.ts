import { Component, type OnInit, ViewChild, type ElementRef } from "@angular/core"
import { FormBuilder, type FormGroup, Validators } from "@angular/forms"
import { DevoirService } from "../../devoir.service"
import { SoumissionsService } from "../../soumissions.service" 
import { CoursService } from "../../cours.service"
import { DepartementsService } from "../../departements.service"
import { NiveauxService } from "../../niveaux.service"
import { SpecialitesService } from "../../specialites.service"
import { MatSnackBar } from "@angular/material/snack-bar"
import { forkJoin } from "rxjs"

@Component({
  selector: "app-devoir",
  templateUrl: "./devoir.component.html",
  styleUrls: ["./devoir.component.css"],
})
export class DevoirComponent implements OnInit {
  // Informations de l'enseignant
  enseignantId = "67c4c2f07fe25e5361a1e1bf" // ID de l'enseignant connecté
  enseignantName = "Israa Bribech"
  enseignantEmail = "israabribech2002@gmail.com"

  // Statistiques
  devoirsStats = {
    total: 0,
    active: 0,
    pending: 0,
    expired: 0,
    submissions: 0,
  }
  activeCount = 0
  submissionsCount = 0

  // Devoirs
  devoirs: any[] = []
  filteredDevoirs: any[] = []
  selectedDevoir: any | null = null

  // Cours
  cours: any[] = []
  filteredCours: any[] = []

  // Départements, Niveaux et Spécialités
  departements: any[] = []
  niveaux: any[] = []
  specialites: any[] = []
  filteredSpecialites: any[] = []
  formFilteredSpecialites: any[] = []

  // Étudiants
  etudiants: any[] = []
  filteredEtudiants: any[] = []
  etudiantSearchTerm = ""

  // Submissions
  submissions: any[] = []
  filteredSubmissions: any[] = []
  selectedSubmission: any | null = null
  submissionSearchTerm = ""

  // Filters
  filters = {
    departement: "",
    niveau: "",
    specialite: "",
    status: "",
  }
  searchTerm = ""

  // View Mode
  viewMode = "grid" // 'grid' or 'list'
  activeTab = "all" // 'all', 'active', 'submitted'
  detailsTab = "submissions" // 'submissions', 'etudiants'

  // Forms
  devoirForm!: FormGroup
  evaluationForm!: FormGroup
  editMode = false
  devoirToEdit: any | null = null
  devoirToDelete: any | null = null

  // File inputs
  @ViewChild("devoirFileInput") devoirFileInput!: ElementRef
  devoirFile: File | null = null

  // Active Modal
  activeModal: string | null = null

  // Loading state
  isLoading = false

  constructor(
    private fb: FormBuilder,
    private devoirService: DevoirService,
    private soumissionsService: SoumissionsService,
    private coursService: CoursService,
    private departementsService: DepartementsService,
    private niveauxService: NiveauxService,
    private specialitesService: SpecialitesService,
    private snackBar: MatSnackBar,
  ) {
    this.initializeForms()
  }

  ngOnInit(): void {
    this.loadAllData()
  }

  private initializeForms(): void {
    this.devoirForm = this.fb.group({
      title: ["", Validators.required],
      description: ["", Validators.required],
      cour: ["", Validators.required],
      departement: ["", Validators.required],
      niveau: ["", Validators.required],
      specialite: ["", Validators.required],
      dueDate: ["", Validators.required],
      notifyEtudiants: [true],
    })

    this.evaluationForm = this.fb.group({
      note: ["", [Validators.required, Validators.min(0), Validators.max(20)]],
      feedback: ["", Validators.required],
      notifyEtudiant: [true],
    })

    // Listen for form changes
    this.devoirForm.get("departement")?.valueChanges.subscribe((value) => {
      if (value) {
        this.onFormDepartementChange({ target: { value } })
      }
    })

    this.devoirForm.get("cour")?.valueChanges.subscribe((value) => {
      if (value) {
        const selectedCour = this.cours.find((c) => c._id === value)
        if (selectedCour) {
          this.devoirForm.patchValue(
            {
              departement: selectedCour.departement,
              niveau: selectedCour.niveau,
              specialite: selectedCour.specialite,
            },
            { emitEvent: false },
          )
        }
      }
    })
  }

  loadAllData(): void {
    this.isLoading = true

    // Utiliser forkJoin pour charger toutes les données en parallèle
    forkJoin({
      departements: this.departementsService.getDepartements(),
      niveaux: this.niveauxService.getNiveaux(),
      specialites: this.specialitesService.getSpecialites(),
      cours: this.coursService.getAllCours()
    }).subscribe({
      next: (results) => {
        // Traiter les départements
        this.departements = results.departements;
        console.log("Départements chargés:", this.departements);

        // Traiter les niveaux
        this.niveaux = results.niveaux;
        console.log("Niveaux chargés:", this.niveaux);

        // Traiter les spécialités
        this.specialites = results.specialites;
        this.filteredSpecialites = [...this.specialites];
        this.formFilteredSpecialites = [...this.specialites];
        console.log("Spécialités chargées:", this.specialites);

        // Traiter les cours
        this.cours = results.cours;
        this.filteredCours = [...this.cours];
        console.log("Cours chargés:", this.cours);

        // Charger les devoirs après avoir chargé les données de référence
        this.loadDevoirs();
        
        // Charger les statistiques des devoirs
        this.loadDevoirsStats();
      },
      error: (error) => {
        console.error("Erreur lors du chargement des données:", error);
        this.showNotification("Erreur lors du chargement des données");
        this.isLoading = false;
      }
    });
  }

  loadDevoirs(): void {
    this.isLoading = true

    const filters = {
      enseignantId: this.enseignantId,
    }

    this.devoirService.getDevoirs(filters).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.devoirs = response.data
          this.filteredDevoirs = [...this.devoirs]
          console.log("Devoirs chargés:", this.devoirs)

          // Charger les soumissions pour chaque devoir
          this.loadAllSubmissions()
        } else {
          console.error("Format de réponse inattendu:", response)
          this.devoirs = []
          this.filteredDevoirs = []
        }
        this.isLoading = false
        this.filterDevoirs()
      },
      error: (error) => {
        console.error("Erreur lors du chargement des devoirs:", error)
        this.showNotification("Erreur lors du chargement des devoirs")
        this.isLoading = false
        this.devoirs = []
        this.filteredDevoirs = []
      },
    })
  }

  // Méthode pour charger les soumissions pour tous les devoirs
  loadAllSubmissions(): void {
    console.log("Chargement des soumissions pour tous les devoirs...")

    // Pour chaque devoir, charger ses soumissions
    this.devoirs.forEach((devoir) => {
      console.log(`Tentative de chargement des soumissions pour le devoir: ${devoir.title} (ID: ${devoir._id})`)

      this.soumissionsService.getSoumissionsByDevoir(devoir._id).subscribe({
        next: (response) => {
          console.log(`Réponse reçue pour le devoir ${devoir.title}:`, response)

          if (response && response.data) {
            const soumissions = response.data
            console.log(`${soumissions.length} soumissions trouvées pour le devoir ${devoir.title}:`, soumissions)

            // Vérifier si des soumissions existent réellement
            if (soumissions.length === 0) {
              // Aucune soumission, initialiser avec un tableau vide
              devoir.submissions = []
              devoir.submissionsCount = 0
              console.log(`Aucune soumission pour le devoir ${devoir.title}`)
            } else {
              // Vérifier et corriger les données de chaque soumission
              soumissions.forEach((soumission: any) => {
                // S'assurer que le nom de l'étudiant est présent
                if (!soumission.etudiantName && soumission.etudiant) {
                  if (typeof soumission.etudiant === 'object' && soumission.etudiant.name) {
                    soumission.etudiantName = soumission.etudiant.name;
                  } else if (typeof soumission.etudiant === 'string') {
                    // Essayer de trouver l'étudiant dans la liste des étudiants
                    const etudiant = this.etudiants.find(e => e._id === soumission.etudiant);
                    if (etudiant) {
                      soumission.etudiantName = etudiant.name;
                    } else {
                      soumission.etudiantName = `Étudiant #${soumission.etudiant.substring(0, 5)}`;
                    }
                  }
                }

                // S'assurer que la date de soumission est correcte
                if (!soumission.dateSoumission) {
                  if (soumission.dateCreation) {
                    soumission.dateSoumission = new Date(soumission.dateCreation);
                  } else if (soumission.createdAt) {
                    soumission.dateSoumission = new Date(soumission.createdAt);
                  } else {
                    soumission.dateSoumission = new Date();
                  }
                } else if (typeof soumission.dateSoumission === 'string') {
                  soumission.dateSoumission = new Date(soumission.dateSoumission);
                }

                // S'assurer que les informations du fichier sont correctes
                if (soumission.fichier) {
                  if (typeof soumission.fichier === 'string') {
                    const nomFichier = soumission.fichier.split('/').pop() || 'fichier.pdf';
                    soumission.fichier = {
                      nom: nomFichier,
                      chemin: soumission.fichier,
                      type: nomFichier.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                      taille: 0
                    };
                  } else if (!soumission.fichier.nom && soumission.fichier.chemin) {
                    soumission.fichier.nom = soumission.fichier.chemin.split('/').pop() || 'fichier.pdf';
                  }
                }
              });

              // Mettre à jour le devoir avec ses soumissions
              devoir.submissions = soumissions
              devoir.submissionsCount = soumissions.length

              // Mettre à jour le compteur global de soumissions
              this.submissionsCount += soumissions.length
            }

            // Mettre à jour les devoirs filtrés
            this.filterDevoirs()
          } else {
            console.warn(`Format de réponse inattendu pour le devoir ${devoir.title}:`, response)
            // Initialiser avec un tableau vide en cas de réponse inattendue
            devoir.submissions = []
            devoir.submissionsCount = 0
          }
        },
        error: (error) => {
          console.error(`Erreur lors du chargement des soumissions pour le devoir ${devoir._id}:`, error)
          // Initialiser avec un tableau vide en cas d'erreur
          devoir.submissions = []
          devoir.submissionsCount = 0
        },
      })
    })
  }

  loadDevoirsStats(): void {
    this.devoirService.getDevoirsGlobalStats(this.enseignantId).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.devoirsStats = response.data
          this.activeCount = this.devoirsStats.active
          this.submissionsCount = this.devoirsStats.submissions
        } else {
          console.error("Format de réponse inattendu pour les statistiques:", response)
          // Calculer les statistiques manuellement comme solution de secours
          this.calculateStatsManually()
        }
      },
      error: (error) => {
        console.error("Erreur lors du chargement des statistiques des devoirs:", error)
        // Calculer les statistiques manuellement en cas d'erreur
        this.calculateStatsManually()
      },
    })
  }

  // Ajoutez cette méthode pour calculer les statistiques manuellement
  calculateStatsManually(): void {
    this.devoirService.getDevoirs({ enseignantId: this.enseignantId }).subscribe({
      next: (response) => {
        if (response && response.data) {
          const devoirs = response.data

          // Calculer les statistiques manuellement
          this.devoirsStats = {
            total: devoirs.length,
            active: devoirs.filter((d: any) => this.isDevoirActive(d)).length,
            pending: devoirs.filter((d: any) => !this.isDevoirExpired(d)).length,
            expired: devoirs.filter((d: any) => this.isDevoirExpired(d)).length,
            submissions: devoirs.reduce(
              (acc: number, d: { submissionsCount?: number }) => acc + (d.submissionsCount || 0),
              0,
            ),
          }

          this.activeCount = this.devoirsStats.active
          this.submissionsCount = this.devoirsStats.submissions
        }
      },
      error: (error) => {
        console.error("Erreur lors du calcul manuel des statistiques:", error)
        // Initialiser avec des valeurs par défaut
        this.devoirsStats = {
          total: 0,
          active: 0,
          pending: 0,
          expired: 0,
          submissions: 0,
        }
      },
    })
  }

  onDepartementChange(event: any): void {
    const departementId = event.target.value
    if (!departementId) {
      this.filteredSpecialites = [...this.specialites]
      return
    }

    this.filteredSpecialites = this.specialites.filter((specialite) => specialite.department === departementId)
  }

  onFormDepartementChange(event: any): void {
    const departementId = event.target.value
    if (!departementId) {
      this.formFilteredSpecialites = [...this.specialites]
      return
    }

    this.formFilteredSpecialites = this.specialites.filter((specialite) => specialite.department === departementId)
  }

  onCourChange(event: any): void {
    const courId = event.target.value
    if (!courId) return

    const selectedCour = this.cours.find((c) => c._id === courId)
    if (selectedCour) {
      this.devoirForm.patchValue({
        departement: selectedCour.departement,
        niveau: selectedCour.niveau,
        specialite: selectedCour.specialite,
      })
    }
  }

  filterDevoirs(): void {
    let filtered = [...this.devoirs]

    // Filtrer par onglet actif
    if (this.activeTab === "active") {
      filtered = filtered.filter((d) => this.isDevoirActive(d))
    } else if (this.activeTab === "submitted") {
      filtered = filtered.filter(
        (d) =>
          (d.submissions &&
            d.submissions.length > 0 &&
            d.submissions.some((s: { evaluated: boolean }) => !s.evaluated)) ||
          false,
      )
    }

    // Appliquer les filtres de département, niveau et spécialité
    if (this.filters.departement) {
      filtered = filtered.filter((devoir) => devoir.departementId === this.filters.departement)
    }

    if (this.filters.niveau) {
      filtered = filtered.filter((devoir) => devoir.niveauId === this.filters.niveau)
    }

    if (this.filters.specialite) {
      filtered = filtered.filter((devoir) => devoir.specialiteId === this.filters.specialite)
    }

    // Appliquer le filtre de statut
    if (this.filters.status) {
      if (this.filters.status === "active") {
        filtered = filtered.filter((d) => this.isDevoirActive(d))
      } else if (this.filters.status === "expired") {
        filtered = filtered.filter((d) => this.isDevoirExpired(d))
      } else if (this.filters.status === "upcoming") {
        filtered = filtered.filter((d) => this.isDevoirUpcoming(d))
      }
    }

    // Appliquer le filtre de recherche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim()
      filtered = filtered.filter(
        (devoir) =>
          devoir.title.toLowerCase().includes(term) ||
          devoir.description.toLowerCase().includes(term) ||
          this.getCourTitle(devoir.courId).toLowerCase().includes(term),
      )
    }

    this.filteredDevoirs = filtered
  }

  resetFilters(): void {
    this.filters = {
      departement: "",
      niveau: "",
      specialite: "",
      status: "",
    }
    this.searchTerm = ""
    this.filterDevoirs()
  }

  filterSubmissions(): void {
    if (!this.selectedDevoir || !this.selectedDevoir.submissions) {
      this.filteredSubmissions = []
      return
    }

    if (!this.submissionSearchTerm.trim()) {
      this.filteredSubmissions = [...this.selectedDevoir.submissions]
      return
    }

    const term = this.submissionSearchTerm.toLowerCase().trim()
    this.filteredSubmissions = this.selectedDevoir.submissions.filter((submission: any) =>
      submission.etudiantName.toLowerCase().includes(term),
    )
  }

  filterEtudiants(): void {
    if (!this.selectedDevoir || !this.selectedDevoir.etudiants) {
      this.filteredEtudiants = []
      return
    }

    if (!this.etudiantSearchTerm.trim()) {
      this.filteredEtudiants = [...this.selectedDevoir.etudiants]
      return
    }

    const term = this.etudiantSearchTerm.toLowerCase().trim()
    this.filteredEtudiants = this.selectedDevoir.etudiants.filter(
      (etudiant: any) =>
        etudiant.name.toLowerCase().includes(term) ||
        etudiant.email.toLowerCase().includes(term) ||
        etudiant.matricule.toLowerCase().includes(term),
    )
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab
    this.filterDevoirs()
  }

  setDetailsTab(tab: string): void {
    this.detailsTab = tab
    if (tab === "submissions") {
      this.submissionSearchTerm = ""
      this.filterSubmissions()
    } else if (tab === "etudiants") {
      this.etudiantSearchTerm = ""
      this.filterEtudiants()
    }
  }

  getTabTitle(): string {
    switch (this.activeTab) {
      case "active":
        return "Devoirs actifs"
      case "submitted":
        return "Soumissions à évaluer"
      default:
        return "Tous les devoirs"
    }
  }

  showModal(modalType: string): void {
    this.activeModal = modalType

    if (modalType === "nouveauDevoir") {
      if (!this.editMode) {
        this.devoirForm.reset({
          notifyEtudiants: true,
        })
        this.devoirFile = null
        if (this.devoirFileInput) {
          this.devoirFileInput.nativeElement.value = ""
        }
      }
    }
  }

  hideModal(): void {
    this.activeModal = null
    this.editMode = false
    this.devoirToEdit = null
    this.devoirToDelete = null
    this.selectedSubmission = null
  }

  onDevoirFileChange(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.devoirFile = input.files[0]
    }
  }

  submitDevoirForm(): void {
    if (this.devoirForm.valid) {
      this.isLoading = true

      const devoirData = {
        ...this.devoirForm.value,
        enseignantId: this.enseignantId,
        statut: "publié",
        options: {
          autoriserRenduTardif: false,
          noteMax: 20,
          visiblePourEtudiants: true,
        },
      }

      // Renommer les champs pour correspondre au backend
      devoirData.courId = devoirData.cour
      devoirData.departementId = devoirData.departement
      devoirData.niveauId = devoirData.niveau
      devoirData.specialiteId = devoirData.specialite

      // Supprimer les champs inutiles
      delete devoirData.cour
      delete devoirData.departement
      delete devoirData.niveau
      delete devoirData.specialite
      delete devoirData.notifyEtudiants

      if (this.editMode && this.devoirToEdit) {
        // Mise à jour du devoir existant
        this.devoirService.updateDevoir(this.devoirToEdit._id, devoirData, this.devoirFile).subscribe({
          next: (response) => {
            console.log("Devoir mis à jour:", response)
            this.showNotification("Devoir mis à jour avec succès")
            this.hideModal()
            this.loadDevoirs()
            this.loadDevoirsStats()
            this.isLoading = false
          },
          error: (error) => {
            console.error("Erreur lors de la mise à jour du devoir:", error)
            this.showNotification("Erreur lors de la mise à jour du devoir")
            this.isLoading = false
          },
        })
      } else {
        // Ajout d'un nouveau devoir
        this.devoirService.addDevoir(devoirData, this.devoirFile).subscribe({
          next: (response) => {
            console.log("Devoir ajouté:", response)
            this.showNotification("Devoir ajouté avec succès")
            this.hideModal()
            this.loadDevoirs()
            this.loadDevoirsStats()
            this.isLoading = false
          },
          error: (error) => {
            console.error("Erreur lors de l'ajout du devoir:", error)
            this.showNotification("Erreur lors de l'ajout du devoir")
            this.isLoading = false
          },
        })
      }
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.devoirForm.controls).forEach((key) => {
        const control = this.devoirForm.get(key)
        control?.markAsTouched()
      })
      this.showNotification("Veuillez remplir tous les champs obligatoires")
    }
  }

  editDevoir(devoir: any): void {
    this.editMode = true
    this.devoirToEdit = devoir

    // Format the date to YYYY-MM-DD for the input field
    const dueDate = new Date(devoir.dueDate)
    const formattedDate = dueDate.toISOString().split("T")[0]

    this.devoirForm.patchValue({
      title: devoir.title,
      description: devoir.description,
      cour: devoir.courId,
      departement: devoir.departementId,
      niveau: devoir.niveauId,
      specialite: devoir.specialiteId,
      dueDate: formattedDate,
      notifyEtudiants: false,
    })

    this.onFormDepartementChange({ target: { value: devoir.departementId } })
    this.showModal("nouveauDevoir")
  }

  deleteDevoir(devoir: any): void {
    this.devoirToDelete = devoir
    this.showModal("confirmation")
  }

  confirmDeleteDevoir(): void {
    if (this.devoirToDelete) {
      this.isLoading = true

      this.devoirService.deleteDevoir(this.devoirToDelete._id).subscribe({
        next: (response) => {
          console.log("Devoir supprimé avec succès:", response)
          this.showNotification("Devoir supprimé avec succès")
          this.hideModal()
          this.loadDevoirs()
          this.loadDevoirsStats()
          this.isLoading = false
        },
        error: (error) => {
          console.error("Erreur lors de la suppression du devoir:", error)
          this.showNotification("Erreur lors de la suppression du devoir")
          this.isLoading = false
        },
      })
    }
  }

  viewDevoirDetails(devoir: any): void {
    this.isLoading = true
    console.log(`Chargement des détails du devoir: ${devoir.title} (ID: ${devoir._id})`)

    // Récupérer les détails complets du devoir
    this.devoirService.getDevoirById(devoir._id).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.selectedDevoir = response.data
          console.log("Détails du devoir récupérés:", this.selectedDevoir)

          // Toujours charger les soumissions fraîches
          console.log(`Chargement des soumissions pour le devoir ${devoir._id}`)
          this.soumissionsService.getSoumissionsByDevoir(devoir._id).subscribe({
            next: (submissionsResponse) => {
              console.log(`Réponse des soumissions pour ${devoir.title}:`, submissionsResponse)

              if (submissionsResponse && submissionsResponse.data) {
                // Vérifier si des soumissions existent réellement
                if (submissionsResponse.data.length === 0) {
                  console.log("Aucune soumission trouvée pour ce devoir")
                  this.selectedDevoir.submissions = []
                  this.filteredSubmissions = []
                } else {
                  // Traiter et normaliser les données de soumission
                  const soumissions = submissionsResponse.data.map((soumission: any) => {
                    // S'assurer que le nom de l'étudiant est présent
                    if (!soumission.etudiantName && soumission.etudiant) {
                      if (typeof soumission.etudiant === 'object' && soumission.etudiant.name) {
                        soumission.etudiantName = soumission.etudiant.name;
                      } else if (typeof soumission.etudiant === 'string') {
                        // Essayer de trouver l'étudiant dans la liste des étudiants
                        const etudiant = this.etudiants.find(e => e._id === soumission.etudiant);
                        if (etudiant) {
                          soumission.etudiantName = etudiant.name;
                        } else {
                          soumission.etudiantName = `Étudiant #${soumission.etudiant.substring(0, 5)}`;
                        }
                      }
                    }

                    // S'assurer que la date de soumission est correcte
                    if (!soumission.dateSoumission) {
                      if (soumission.dateCreation) {
                        soumission.dateSoumission = new Date(soumission.dateCreation);
                      } else if (soumission.createdAt) {
                        soumission.dateSoumission = new Date(soumission.createdAt);
                      } else {
                        soumission.dateSoumission = new Date();
                      }
                    } else if (typeof soumission.dateSoumission === 'string') {
                      soumission.dateSoumission = new Date(soumission.dateSoumission);
                    }

                    // S'assurer que les informations du fichier sont correctes
                    if (soumission.fichier) {
                      if (typeof soumission.fichier === 'string') {
                        const nomFichier = soumission.fichier.split('/').pop() || 'fichier.pdf';
                        soumission.fichier = {
                          nom: nomFichier,
                          chemin: soumission.fichier,
                          type: nomFichier.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                          taille: 0
                        };
                      } else if (!soumission.fichier.nom && soumission.fichier.chemin) {
                        soumission.fichier.nom = soumission.fichier.chemin.split('/').pop() || 'fichier.pdf';
                      }
                    }

                    return soumission;
                  });

                  this.selectedDevoir.submissions = soumissions;
                  this.filteredSubmissions = soumissions;
                  console.log(`${soumissions.length} soumissions chargées:`, soumissions);
                }
              } else {
                console.warn("Format de réponse inattendu pour les soumissions:", submissionsResponse)
                this.selectedDevoir.submissions = []
                this.filteredSubmissions = []
              }

              this.detailsTab = "submissions"
              this.showModal("devoirDetails")
              this.isLoading = false
            },
            error: (error) => {
              console.error("Erreur lors du chargement des soumissions:", error)
              this.detailsTab = "submissions"
              this.selectedDevoir.submissions = []
              this.filteredSubmissions = []
              this.showModal("devoirDetails")
              this.isLoading = false
            },
          })
        } else {
          console.error("Format de réponse inattendu:", response)
          this.showNotification("Erreur lors de la récupération des détails du devoir")
          this.isLoading = false
        }
      },
      error: (error) => {
        console.error("Erreur lors de la récupération des détails du devoir:", error)
        this.showNotification("Erreur lors de la récupération des détails du devoir")
        this.isLoading = false
      },
    })
  }

  viewSubmission(submission: any): void {
    this.selectedSubmission = submission
    this.evaluationForm.patchValue({
      note: submission.note || "",
      feedback: submission.feedback || "",
      notifyEtudiant: true,
    })
    this.showModal("evaluation")
  }

  evaluateSubmission(submission: any): void {
    this.selectedSubmission = submission
    this.evaluationForm.patchValue({
      note: submission.note || "",
      feedback: submission.feedback || "",
      notifyEtudiant: true,
    })
    this.showModal("evaluation")
  }

  submitEvaluation(): void {
    if (this.evaluationForm.valid && this.selectedSubmission && this.selectedDevoir) {
      this.isLoading = true

      const evaluationData = {
        note: this.evaluationForm.value.note,
        feedback: this.evaluationForm.value.feedback,
      }

      // Appeler le service pour évaluer la soumission
      this.soumissionsService
        .evaluerSoumission(this.selectedSubmission._id, evaluationData.note, evaluationData.feedback)
        .subscribe({
          next: (response) => {
            console.log("Évaluation enregistrée:", response)

            // Mettre à jour la soumission dans la liste
            if (this.selectedDevoir && this.selectedDevoir.submissions) {
              const index = this.selectedDevoir.submissions.findIndex(
                (s: any) => s._id === this.selectedSubmission?._id,
              )
              if (index !== -1) {
                this.selectedDevoir.submissions[index] = {
                  ...this.selectedDevoir.submissions[index],
                  evaluated: true,
                  note: evaluationData.note,
                  feedback: evaluationData.feedback,
                }
                this.filterSubmissions()
              }
            }

            this.showNotification("Évaluation enregistrée avec succès")
            this.isLoading = false
            this.hideModal()
          },
          error: (error) => {
            console.error("Erreur lors de l'évaluation:", error)
            this.showNotification("Erreur lors de l'évaluation de la soumission")
            this.isLoading = false
          },
        })
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.evaluationForm.controls).forEach((key) => {
        const control = this.evaluationForm.get(key)
        control?.markAsTouched()
      })
      this.showNotification("Veuillez remplir tous les champs obligatoires")
    }
  }

  downloadDevoirFile(devoir: any): void {
    if (devoir.fichier && devoir.fichier.chemin) {
      this.devoirService.telechargerFichierConsigne(devoir._id).subscribe({
        next: (blob) => {
          // Créer un URL pour le blob
          const url = window.URL.createObjectURL(blob);
          
          // Déterminer le nom du fichier
          let fileName = "consigne.pdf";
          if (devoir.fichier.nom) {
            fileName = devoir.fichier.nom;
          } else if (devoir.fichier.chemin) {
            const pathParts = devoir.fichier.chemin.split('/');
            fileName = pathParts[pathParts.length - 1];
          }
          
          // Créer un élément <a> pour déclencher le téléchargement
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          
          // Nettoyer
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          this.showNotification("Téléchargement du fichier terminé");
        },
        error: (error) => {
          console.error("Erreur lors du téléchargement du fichier:", error);
          this.showNotification("Erreur lors du téléchargement du fichier");
          
          // Fallback: essayer d'ouvrir directement l'URL du fichier
          if (devoir.fichier && devoir.fichier.chemin) {
            const fileUrl = `http://localhost:5001${devoir.fichier.chemin.replace(/^\//, "")}`;
            window.open(fileUrl, "_blank");
          }
        }
      });
    } else {
      this.showNotification("Aucun fichier disponible pour ce devoir");
    }
  }

  downloadSubmission(submission: any): void {
    if (submission && submission._id) {
      this.soumissionsService.telechargerFichierSoumission(submission._id).subscribe({
        next: (blob) => {
          // Créer un URL pour le blob
          const url = window.URL.createObjectURL(blob);
          
          // Déterminer le nom du fichier
          let fileName = "soumission.pdf";
          if (submission.fichier) {
            if (typeof submission.fichier === 'object' && submission.fichier.nom) {
              fileName = submission.fichier.nom;
            } else if (typeof submission.fichier === 'string') {
              const pathParts = submission.fichier.split('/');
              fileName = pathParts[pathParts.length - 1];
            }
          }
          
          // Créer un élément <a> pour déclencher le téléchargement
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          
          // Nettoyer
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          this.showNotification("Téléchargement du fichier terminé");
        },
        error: (error) => {
          console.error("Erreur lors du téléchargement du fichier:", error);
          this.showNotification("Erreur lors du téléchargement du fichier");
          
          // Fallback: essayer d'ouvrir directement l'URL du fichier
          const fileUrl = this.soumissionsService.getSoumissionFileUrl(submission._id);
          window.open(fileUrl, "_blank");
        }
      });
    } else {
      this.showNotification("Aucun fichier disponible pour cette soumission");
    }
  }

  viewEtudiantDetails(etudiant: any): void {
    console.log("Voir les détails de l'étudiant:", etudiant)
    // Dans une implémentation réelle, cela ouvrirait une modal avec les détails
    this.showNotification(`Détails de l'étudiant: ${etudiant.name}`)
  }

  sendReminderToEtudiant(etudiant: any): void {
    if (this.selectedDevoir) {
      console.log("Rappel envoyé à:", etudiant.name, "pour le devoir:", this.selectedDevoir.title)
      // Dans une implémentation réelle, cela enverrait un email
      this.showNotification(`Rappel envoyé à ${etudiant.name} pour le devoir: ${this.selectedDevoir.title}`)
    }
  }

  // Méthodes utilitaires
  getDepartementName(id: string): string {
    const departement = this.departements.find((d) => d._id === id)
    return departement ? departement.name : "Non spécifié"
  }

  getNiveauName(id: string): string {
    const niveau = this.niveaux.find((n) => n._id === id)
    return niveau ? niveau.name : "Non spécifié"
  }

  getSpecialiteName(id: string): string {
    const specialite = this.specialites.find((s) => s._id === id)
    return specialite ? specialite.name : "Non spécifié"
  }

  getCourTitle(id: string): string {
    const cour = this.cours.find((c) => c._id === id)
    return cour ? cour.title || cour.titre : "Non spécifié"
  }

  isDevoirActive(devoir: any): boolean {
    const now = new Date()
    const dueDate = new Date(devoir.dueDate)
    const createdAt = new Date(devoir.createdAt || devoir.dateCreation)
    return dueDate > now && createdAt <= now
  }

  isDevoirExpired(devoir: any): boolean {
    const now = new Date()
    const dueDate = new Date(devoir.dueDate)
    return dueDate <= now
  }

  isDevoirUpcoming(devoir: any): boolean {
    const now = new Date()
    const createdAt = new Date(devoir.createdAt || devoir.dateCreation)
    return createdAt > now
  }

  getDevoirStatus(devoir: any): string {
    if (this.isDevoirActive(devoir)) {
      return "Actif"
    } else if (this.isDevoirExpired(devoir)) {
      return "Expiré"
    } else if (this.isDevoirUpcoming(devoir)) {
      return "À venir"
    }
    return "Inconnu"
  }

  // Formater la date pour l'affichage
  formatDate(date: Date): string {
    if (!date) return "Date inconnue";
    
    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      return "Date invalide";
    }
    
    // Formater la date au format DD/MM/YYYY HH:MM
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  showNotification(message: string, action = "Fermer", duration = 3000): void {
    this.snackBar.open(message, action, {
      duration: duration,
      horizontalPosition: "end",
      verticalPosition: "top",
    })
  }
}
