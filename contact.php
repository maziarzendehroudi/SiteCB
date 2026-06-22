<?php
// Vérifie que le formulaire a bien été soumis via la méthode POST
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // 1. Récupération et nettoyage des données pour la sécurité
    $nom = htmlspecialchars(strip_tags(trim($_POST["name"])));
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $message = htmlspecialchars(strip_tags(trim($_POST["message"])));

    // 2. Vérification que les champs ne sont pas vides et que l'e-mail est valide
    if (empty($nom) || empty($message) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo "Une erreur est survenue. Veuillez vérifier que tous les champs sont correctement remplis.";
        exit;
    }

    // 3. Configuration de l'e-mail de destination
    // REMPLACEZ par l'adresse e-mail du cabinet
    $destinataire = "contact@votre-domaine.fr"; 
    
    $sujet = "Nouveau message depuis le site web - $nom";
    
    // 4. Construction du corps du message
    $contenu = "Vous avez reçu un nouveau message depuis le formulaire de contact du site.\n\n";
    $contenu .= "Nom / Prénom : $nom\n";
    $contenu .= "E-mail : $email\n\n";
    $contenu .= "Message :\n$message\n";

    // 5. Configuration des en-têtes (Headers)
    $headers = "From: webmaster@votre-domaine.fr\r\n"; // Utilisez une adresse liée à votre domaine OVH pour éviter les filtres anti-spam
    $headers .= "Reply-To: $email\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    // 6. Envoi de l'e-mail et redirection
    if (mail($destinataire, $sujet, $contenu, $headers)) {
        // Redirection vers la page de contact (ou une autre page) en cas de succès
        // Vous pouvez ajouter un paramètre ?success=1 pour afficher un message de confirmation en JavaScript plus tard si vous le souhaitez
        header("Location: contact.html");
        exit;
    } else {
        echo "Une erreur technique est survenue lors de l'envoi du message.";
    }

} else {
    // Si l'accès au fichier ne se fait pas par le formulaire
    echo "Méthode non autorisée.";
}
?>