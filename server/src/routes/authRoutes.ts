import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";
import prisma from "../config/prisma";

const router = Router();

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "parcel-management-system-super-secret-key";

const RESET_TOKEN_EXPIRY_MINUTES = 15;
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{11,}$/;

const PASSWORD_ERROR_MESSAGE =
  "Password must be at least 11 characters long and contain an uppercase letter, a lowercase letter, a number, and a special symbol.";

const GENERIC_RESET_MESSAGE =
  "If an active account exists with that email, password-reset instructions will be sent.";

/*
  Send a password-reset email using Resend.
*/
async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (!apiKey || !emailFrom) {
    throw new Error(
      "Resend is not configured. Check RESEND_API_KEY and EMAIL_FROM."
    );
  }

  const escapeHtml = (value: string): string =>
    value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entities[character];
    });

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        subject: "Reset your ParcelFlow password",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto;">
            <h2>Reset your ParcelFlow password</h2>
            <p>Hello ${escapeHtml(name)},</p>
            <p>We received a request to reset your ParcelFlow password.</p>
            <p>
              <a
                href="${escapeHtml(resetUrl)}"
                style="display: inline-block; padding: 12px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;"
              >
                Reset Password
              </a>
            </p>
            <p>This link expires in ${RESET_TOKEN_EXPIRY_MINUTES} minutes and can only be used once.</p>
            <p>If you did not request this change, you can ignore this email.</p>
            <p>ParcelFlow Support</p>
          </div>
        `,
      }),
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend email failed: ${details}`);
  }
}

/*
  REGISTER
  POST /api/register
*/
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        phone,
        password: passwordHash,
        role: "CUSTOMER",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_REGISTERED",
        entity: "User",
        entityId: user.id,
      },
    });

    return res.status(201).json({
      message: "Account created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Unable to create account",
    });
  }
});

/*
  LOGIN
  POST /api/login
*/
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        message: `Account is ${user.status.toLowerCase()}`,
      });
    }

    const passwordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_LOGIN",
        entity: "User",
        entityId: user.id,
      },
    });

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Unable to login",
    });
  }
});

/*
  FORGOT PASSWORD
  POST /api/forgot-password
*/
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "Please enter your email address.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    // Return the same response whether or not an account exists.
    if (!user || user.status !== "ACTIVE") {
      return res.json({
        message: GENERIC_RESET_MESSAGE,
      });
    }

    const rawToken = randomBytes(32).toString("hex");

    const tokenHash = createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(
      Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000
    );

    // Invalidate previous unused reset links for this account.
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const clientUrl = (
      process.env.CLIENT_URL || "http://192.168.0.104:5173"
    ).trim().replace(/\/+$/, "");

    const resetUrl =
      `${clientUrl}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail(
        user.email,
        user.name,
        resetUrl
      );
    } catch (emailError) {
      console.error(
        "Password-reset email delivery failed:",
        emailError
      );

      // Development-only fallback for testing when the email
      // provider cannot deliver to the requested recipient.
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "DEVELOPMENT ONLY — password-reset link:",
          resetUrl
        );
      } else {
        // Do not leave an undelivered reset link usable in production.
        await prisma.passwordResetToken.updateMany({
          where: {
            userId: user.id,
            tokenHash,
            usedAt: null,
          },
          data: {
            usedAt: new Date(),
          },
        });
      }
    }

    return res.json({
      message: GENERIC_RESET_MESSAGE,
    });
  } catch (error) {
    console.error("Forgot-password error:", error);

    return res.status(500).json({
      message: "Unable to process your request right now.",
    });
  }
});

/*
  RESET PASSWORD
  POST /api/reset-password

  Request body:
  {
    "token": "token-from-email-link",
    "password": "your-new-password"
  }
*/
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (
      typeof token !== "string" ||
      !token.trim() ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Reset token and new password are required.",
      });
    }

    if (!PASSWORD_REGEX.test(password)) {
  return res.status(400).json({
    message: PASSWORD_ERROR_MESSAGE,
  });
}

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const now = new Date();

    const resetRecord =
      await prisma.passwordResetToken.findFirst({
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: {
            gt: now,
          },
          user: {
            status: "ACTIVE",
          },
        },
      });

    if (!resetRecord) {
      return res.status(400).json({
        message:
          "This reset link is invalid, expired, or already used. Please request a new one.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Atomically consume the token and update the password.
    // If either operation fails, the transaction rolls back.
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: resetRecord.id,
          tokenHash,
          usedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          usedAt: new Date(),
        },
      });

      if (consumed.count !== 1) {
        throw new Error(
          "RESET_TOKEN_ALREADY_USED_OR_EXPIRED"
        );
      }

      await tx.user.update({
        where: {
          id: resetRecord.userId,
        },
        data: {
          password: passwordHash,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: resetRecord.userId,
          action: "PASSWORD_RESET",
          entity: "User",
          entityId: resetRecord.userId,
        },
      });
    });

    return res.json({
      message:
        "Your password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "RESET_TOKEN_ALREADY_USED_OR_EXPIRED"
    ) {
      return res.status(400).json({
        message:
          "This reset link is invalid, expired, or already used. Please request a new one.",
      });
    }

    console.error("Reset-password error:", error);

    return res.status(500).json({
      message: "Unable to reset your password right now.",
    });
  }
});

export default router;