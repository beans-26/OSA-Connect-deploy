# Building frontend
cd ../frontend
npm install
npm run build
cd ../backend

pip install -r requirements.txt

# Map frontend dist to static
python manage.py collectstatic --no-input
python manage.py migrate
