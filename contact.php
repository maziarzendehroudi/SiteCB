<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $nom = htmlspecialchars(strip_tags(trim($_POST["name"])));
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $message = htmlspecialchars(strip_tags(trim($_POST["message"])));

    if (empty($nom) || empty($message) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo "Une erreur est survenue. Veuillez vérifier que tous les champs sont correctement remplis.";
        exit;
    }

    $destinataire = "contact@votre-domaine.fr"; 
    $sujet = "Nouveau message depuis le site web - $nom";
    $contenu = "Vous avez reçu un nouveau message depuis le formulaire de contact du site.\n\nNom / Prénom : $nom\nE-mail : $email\n\nMessage :\n$message\n";
    $headers = "From: webmaster@votre-domaine.fr\r\nReply-To: $email\r\nX-Mailer: PHP/" . phpversion();

    if (mail($destinataire, $sujet, $contenu, $headers)) {
        header("Location: contact.html");
        exit;
    } else {
        echo "Une erreur technique est survenue lors de l'envoi du message.";
    }
} else {
    echo "Méthode non autorisée.";
}
?>