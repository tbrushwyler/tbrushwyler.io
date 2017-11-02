task :default => [:build]

task :clean do
	sh 'rm -rf ./_site'
end

task :build do
	system("jekyll build")
end

task :rebuild => [:clean, :build] do

end