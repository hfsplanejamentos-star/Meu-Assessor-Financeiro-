package br.com.meuassessor.capture;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;

import java.util.concurrent.Executor;

final class AppLock {
    static final int REQUEST_DEVICE_CREDENTIAL = 704;

    private AppLock() {}

    static void authenticate(Activity activity, Runnable success, Runnable cancel) {
        KeyguardManager keyguard =
                (KeyguardManager) activity.getSystemService(Context.KEYGUARD_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            BiometricManager manager =
                    (BiometricManager) activity.getSystemService(Context.BIOMETRIC_SERVICE);
            boolean biometricAvailable = manager != null
                    && manager.canAuthenticate() == BiometricManager.BIOMETRIC_SUCCESS;

            if (biometricAvailable) {
                Executor executor = activity.getMainExecutor();
                BiometricPrompt.Builder builder = new BiometricPrompt.Builder(activity)
                        .setTitle("Meu Assessor Financeiro IA")
                        .setSubtitle("Confirme sua identidade para acessar seus dados");

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                        && keyguard != null && keyguard.isDeviceSecure()) {
                    builder.setDeviceCredentialAllowed(true);
                } else {
                    builder.setNegativeButton("Cancelar", executor,
                            (dialog, which) -> cancel.run());
                }

                BiometricPrompt prompt = builder.build();
                prompt.authenticate(new CancellationSignal(), executor,
                        new BiometricPrompt.AuthenticationCallback() {
                            @Override
                            public void onAuthenticationSucceeded(
                                    BiometricPrompt.AuthenticationResult result) {
                                success.run();
                            }

                            @Override
                            public void onAuthenticationError(int code, CharSequence message) {
                                cancel.run();
                            }
                        });
                return;
            }
        }

        if (keyguard != null && keyguard.isDeviceSecure()) {
            Intent credential = keyguard.createConfirmDeviceCredentialIntent(
                    "Meu Assessor Financeiro IA",
                    "Confirme sua identidade para acessar seus dados");
            if (credential != null) {
                activity.startActivityForResult(credential, REQUEST_DEVICE_CREDENTIAL);
                return;
            }
        }

        // Se o aparelho não tiver nenhum bloqueio configurado, não há credencial segura a validar.
        success.run();
    }
}
