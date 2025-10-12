import sys
from app import app, db, User

def make_admin(email):
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if user:
            user.is_admin = True
            db.session.commit()
            print(f"Success! User '{user.username}' with email '{email}' is now an admin.")
        else:
            print(f"Error: No user found with the email '{email}'.")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python make_admin.py <user_email>")
    else:
        user_email = sys.argv[1]
        make_admin(user_email)